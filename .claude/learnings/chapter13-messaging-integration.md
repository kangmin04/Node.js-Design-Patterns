# Chapter 13 — 메시징과 통합 패턴

## 개요

이 챕터는 12장에서 다룬 "여러 프로세스/머신으로 애플리케이션을 쪼개는(MSA)" 다음 단계로, 쪼개진 서비스들이 **비동기적으로 통신**하는 방법을 다룬다. 핵심 문제는 "서비스 A가 서비스 B에게 무언가를 전달하고 싶은데, 둘이 항상 동시에 켜져 있다는 보장이 없고, 수신자가 1명일 수도 N명일 수도 있다"는 것이다. 이를 풀기 위해 예제는 **같은 채팅 애플리케이션 하나를 6단계로 계속 리팩터링**하며 기술 스택을 WebSocket 단독 → Redis Pub/Sub → ZeroMQ(브로커리스) → AMQP/RabbitMQ(DLX 포함) → Redis Stream → 사용자 식별까지 추가한 Redis Stream 순으로 바꿔간다. 이후 `07-task-distribution`에서는 pub/sub과 대비되는 **경쟁 소비자(competing consumer)** 패턴을, `08-request-reply`와 `09-request-reply-return-address`에서는 비동기 채널 위에 **동기적 요청/응답 흐름을 흉내 내는 correlation ID 패턴**을 자식 프로세스 채널 → AMQP 회신 큐(return address) 순으로 발전시킨다. `exercise/`는 이 패턴들을 각각 Redis Stream 기반 멀티룸 채팅, Socket.IO 기반 멀티룸 채팅으로 응용한 결과물이다.

`study.txt`에는 이 챕터를 학습하며 남긴 900줄 분량의 개인 노트가 있는데, gRPC와 메시징의 역할 차이, 메시지 타입(Command/Event/Document), Pull/Push 딜리버리, 브로커 vs 브로커리스, WebSocket 핸드셰이크, Redis 영속성(RDB/AOF), ZeroMQ 내부 동작, AMQP의 Exchange/Queue/Binding, Redis Stream 명령어, MQ vs Stream, Correlation ID 등 이론적 기반을 아주 상세히 정리해두었다. 아래 노트는 코드와 이 이론 노트를 통합했다.

---

### 개념 1: Publish/Subscribe 패턴 — 6단계 리팩터링으로 배우는 결합도 낮추기

Pub/Sub의 본질은 "발행자(publisher)는 누가 듣고 있는지 몰라도 되고, 구독자(subscriber)는 누가 보냈는지 몰라도 된다"는 **극단적 결합도 감소**다. `study.txt`의 표현을 빌리면 이벤트 메시지(Event Message)는 "발행자는 누가 이 이벤트를 처리할지, 몇 개의 서비스가 처리할지 관심이 없다"(`study.txt:51`)는 성격을 가진다. 이 챕터는 이 원칙 하나를 기술 스택을 바꿔가며 6번 재구현해서, "메시지 브로드캐스트"라는 요구사항이 인프라 선택에 따라 어떻게 달라지는지 체감하게 만든다.

#### 1단계 — `01-chat-websocket`: 단일 프로세스 브로드캐스트 (분산 아님)

```js
// chapters/chapter13_messaging-integration/01-06-pub-sub/01-chat-websocket/index.mjs:13-28
const wss = new WebSocketServer({server})
wss.on('connection', client => {
    console.log('Client connected')
    client.on('message', msg => {
        console.log(`Message: ${msg}`)
        broadcast(msg)
    })
})

function broadcast(msg){
    for(const client of wss.clients){
        if(client.readyState === WebSocket.OPEN){
            client.send(msg); 
        }
    }
}
```

`wss.clients`(같은 프로세스 메모리 안에 있는 Set)를 순회하며 직접 전송한다. 서버가 1대일 때는 완벽하게 동작하지만, 수평 확장을 위해 서버를 2대 이상 띄우면 **8080 서버에 연결된 클라이언트에게는 8081 서버에서 받은 메시지가 절대 전달되지 않는다** — `wss.clients`는 프로세스 로컬 상태이기 때문이다. 이 한계가 다음 단계로 넘어가는 동기가 된다.

#### 2단계 — `02-chat-redis`: 브로커 도입, 발행자=구독자 문제

```js
// chapters/chapter13_messaging-integration/01-06-pub-sub/02-chat-redis/index.mjs:14-35
const wss = new WebSocketServer({ server })
wss.on('connection', client => {
  client.on('message', msg => {
    redisPub.publish('chat_messages', msg)   // 로컬 브로드캐스트 안 함, 무조건 Redis로만 보냄
  })
})

redisSub.subscribe('chat_messages')
redisSub.on('message', (channel, msg) => {
  if (channel === 'chat_messages') {
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(Buffer.from(msg))
      }
    }
  }
})
```

핵심 설계: **`redisPub`(발행 전용)과 `redisSub`(구독 전용)을 별도 커넥션으로 분리**했다. Redis pub/sub은 발행자 자신도 구독자에 포함되므로("메시지 수신 → 무조건 방송"이라는 단순 로직, `study.txt:463-467`), 서버는 클라이언트로부터 받은 메시지를 로컬에서 바로 broadcast하지 않고 **반드시 Redis를 왕복시켜서** 받는다. 이 덕분에 서버가 몇 대든 로직이 동일해진다(N개 서버 모두 같은 채널을 구독하고 있으면 자동으로 전파됨). 이것이 `study.txt`가 강조하는 **브로커 모델**의 핵심 이점 — "완벽한 분리(Decoupling): Producer와 Consumer는 서로를 전혀 몰라도 되며, 심지어 동시에 온라인 상태일 필요도 없다"(`study.txt:299-300`, 단 pub/sub 채널 자체는 구독 시점이 늦으면 그 이전 메시지를 못 받는 "약한 전달 보장"을 가진다).

Redis 자체는 인메모리 DB이지만 RDB(스냅샷) 또는 AOF(append-only 로그) 방식으로 영속성을 제공할 수 있다는 점, 그리고 싱글 스레드 구조 덕분에 명령어가 원자적으로 처리된다는 점도 `study.txt:262-278`에 정리되어 있다.

#### 3단계 — `03-chat-zeromq`: 브로커리스 P2P, bind/connect의 의미

```js
// chapters/chapter13_messaging-integration/01-06-pub-sub/03-chat-zeromq/index.mjs:35-43
const pubSocket = new zmq.Publisher(); 
await pubSocket.bind(`tcp://127.0.0.1:${args.pub}`)
const subSocket = new zmq.Subscriber()

for (const port of args.sub) {
    await subSocket.connect(`tcp://127.0.0.1:${port}`)
}
subSocket.subscribe('chat_messages'); 
```

ZeroMQ는 브로커 서버 없이 각 노드가 라이브러리 레벨에서 P2P로 직접 연결된다. `bind`는 "내 주소는 여기다"라고 포트를 선점하고 연결을 기다리는 동작, `connect`는 그 주소로 직접 찾아가는 동작이다(`study.txt:442-443`). 예를 들어 `node index.mjs --http 8080 --pub 5000 --sub 5001 --sub 5002` 형태로 3개의 채팅 서버를 각각 다른 포트 조합으로 띄우면, 서로가 서로를 구독하는 **완전 연결 메시 네트워크**가 만들어진다(`study.txt:444-450`).

여기서 Redis와의 결정적 차이가 드러난다: ZeroMQ의 PUB 소켓은 **자기 자신의 SUB 소켓에는 메시지를 보내지 않는다**(불필요한 피드백 루프 방지가 의도된 설계, `study.txt:458-462`). 그래서 이 서버는 클라이언트에게서 받은 메시지를 로컬 `broadcast()`로 즉시 뿌리면서 **동시에** `pubSocket.send()`로 다른 서버들에게도 전파해야 한다:

```js
// chapters/chapter13_messaging-integration/01-06-pub-sub/03-chat-zeromq/index.mjs:56-64
wss.on('connection', client => {
    client.on('message', msg => {
        broadcast(msg);                        // 내 서버에 붙은 클라이언트들
        pubSocket.send(['chat_messages', msg])  // 다른 서버들
    })
})
```

Redis 버전과 달리 "받은 메시지를 브로커를 거쳐서만 방송"하는 단일 경로가 아니라 "로컬 방송 + 원격 전파"의 **이중 경로**가 필요한 이유가 여기 있다. `study.txt`는 ZeroMQ가 해결해주는 저수준 소켓 프로그래밍의 4가지 문제도 정리한다: ① 논블로킹 I/O를 내부 스레드가 처리, ② 재연결(Reconnect)을 라이브러리가 자동 보장, ③ 메시지 경계를 지켜주는 프레이밍(TCP는 바이트 스트림이라 원래는 직접 구현해야 함), ④ HWM(High Water Mark)로 배압(backpressure) 제어(`study.txt:344-358`).

#### 4단계 — `04-chat-amqp`: 익스체인지/큐/바인딩, 그리고 DLX

```js
// chapters/chapter13_messaging-integration/01-06-pub-sub/04-chat-amqp/index.mjs:7-18
const connection = await amqp.connect('amqp://localhost') 
const channel = await connection.createChannel(); 
await channel.assertExchange('chat', 'fanout')
const {queue} = await channel.assertQueue(`chat_srv_${httpPort}`, {exclusive: true})
await channel.bindQueue(queue, 'chat')
channel.consume(queue, (msg) => {
    msg = msg.content.toString(); 
    broadcast(Buffer.from(msg))
}, {noAck: true}) 
```

AMQP는 `publisher → exchange → queue → consumer`라는 3단 구조를 가진다(`study.txt:547-563`). `fanout` 타입 익스체인지는 라우팅 키를 무시하고 바인딩된 **모든** 큐에 메시지를 복제해서 뿌린다 — pub/sub 브로드캐스트에 정확히 대응된다. 채팅 서버는 `exclusive: true`로 자신만의 큐를 만드는데, 이는 "이 서버가 오프라인이면 메시지를 받지 않아도 된다(fire-and-forget)"는 설계 의도다. 반면 이력을 영구 저장해야 하는 히스토리 서비스는 `durable: true`로 **브로커 재시작에도 살아남는 큐**를 만든다:

```js
// chapters/chapter13_messaging-integration/01-06-pub-sub/04-chat-amqp/historySvc.mjs:9-19
await channel.assertExchange('chat', 'fanout')
const {queue} = await channel.assertQueue('chat-history', {durable: true})
await channel.bindQueue(queue,'chat')
channel.consume(queue, async (msg) => {
    try{
        const data = JSON.parse(msg.content.toString())
        await db.put(ulid(), data);
        channel.ack(msg)
    }catch(err){
        console.error(`Failed to process messages: `, err)
    }
})
```

`assertExchange`/`assertQueue`는 "있으면 그대로 쓰고 없으면 만든다"는 **멱등성**을 가진 선언이다. 여러 서비스가 각자 코드에서 동일한 이름의 exchange를 assert해도 결국 RabbitMQ 브로커 안의 **단 하나의 실체**를 공유하게 된다(`study.txt:646-726`의 "왜 모든 서비스 코드에 assert 코드가 있나" 심화 노트 참고) — 이것이 Redis pub/sub과 달리 "메모리 공유가 아니라 외부 브로커 프로세스를 통한 네트워크 공유"라는 점을 분명히 보여준다.

**DLX(Dead Letter Exchange)** — `noAck: true`가 아니라 수동 ack를 쓰는 히스토리 큐에서, consumer가 `ack`도 `nack`도 안 하고 죽거나 처리 중 예외가 나면 RabbitMQ는 기본적으로 메시지를 큐에 다시 넣는다(requeue). DB 에러가 계속 나는 상황이면 이게 무한 재시도 루프로 시스템을 마비시킬 수 있다. `dlx-version/historySvc.mjs`는 이를 별도 exchange로 격리한다:

```js
// chapters/chapter13_messaging-integration/01-06-pub-sub/04-chat-amqp/dlx-version/historySvc.mjs:22-49
await channel.assertExchange('dlx', 'fanout')
const {queue:queueDLX} = await channel.assertQueue('dlq', {durable: true})
await channel.bindQueue(queueDLX, 'dlx')

const {queue} = await channel.assertQueue('chat-history', {
    durable: true, 
    arguments: { 'x-dead-letter-exchange': 'dlx' }
}) 
await channel.bindQueue(queue,'chat') 

channel.consume(queue, async (msg) => {
    try{
        const data = JSON.parse(msg.content.toString())
        if(data.text=== 'error') throw new Error('intended errorMessage.')
        await db.put(ulid(), data); 
        channel.ack(msg) 
    }catch(err){
        channel.nack(msg, false, false)   // requeue=false → DLX로 이동
    }
})
```

`channel.nack(msg, false, false)`의 세 번째 인자 `requeue: false`가 핵심이다 — "이 메시지는 문제가 있으니 원래 큐로 되돌리지 말고 버려라"는 뜻이며, 큐에 `x-dead-letter-exchange` 인자가 걸려 있으면 버려지는 대신 DLX로 라우팅된다. 실무에서는 DLQ에 쌓인 메시지를 보고 알림을 받아 버그를 고치거나, 일시적 장애 복구 후 원래 큐로 재발행하는 식으로 활용한다(`study.txt:52-55` 주석).

#### 5·6단계 — `05-chat-redisStream` / `06-chat-redisStream-discern-user`: 큐에서 로그로

```js
// chapters/chapter13_messaging-integration/01-06-pub-sub/05-chat-redisStream/index.mjs:57-73
let lastRecordId = '$'
async function processStreamMessages(){
    while(true){
        const [[, records ]] = await redisClientXread.xread(
            'BLOCK', '0', 'STREAMS', 'chat_stream', lastRecordId
        )
        for(const [recordId, [, message]] of records){
            broadcast(Buffer.from(message))
            lastRecordId = recordId
        }
    }
}
```

Redis Pub/Sub과 Redis Stream의 결정적 차이: pub/sub 채널은 메시지를 저장하지 않아 늦게 구독한 클라이언트는 과거 메시지를 못 보지만, Stream은 **append-only 로그**라서 `xrange`로 과거 이력을 언제든 조회할 수 있다(`study.txt:34-46`, "chat logs 전체를 xrange로 가져와서 새로 접속한 클라이언트에게 보냄"). `xread ... BLOCK 0`은 새 메시지가 올 때까지 무한 대기하며, 이 블로킹 특성 때문에 **발행용 커넥션(`redisClient`)과 구독용 커넥션(`redisClientXread`)을 분리**해야 한다 — 하나의 커넥션으로 양쪽을 다 하면 `xread` 대기 중 발행이 막힌다(단일 스레드 Redis의 제약).

`06-chat-redisStream-discern-user`는 여기에 **메시지 봉투 패턴(Envelope Pattern)**을 추가한다 — `study.txt:812-813`이 정리하듯 처음엔 순수 텍스트만 주고받다가 `{ type, payload }` 구조를 도입해 'ID 할당'과 '채팅 메시지'를 하나의 채널에서 구분할 수 있게 했다:

```js
// chapters/chapter13_messaging-integration/01-06-pub-sub/06-chat-redisStream-discern-user/ver2/index.mjs:18-27
client.id = uuidv4();
client.send(JSON.stringify({
    type: 'id', 
    payload: client.id 
}))
```

연결마다 서버가 UUID를 발급해 클라이언트에게 알려주고, 이후 모든 채팅 메시지에 `senderId`를 실어 보낸다. 로그인이 없는 익명 채팅에서는 "연결(connection)" 자체가 신원의 단위이므로, 클라이언트가 스스로 ID를 만드는 대신 **서버가 연결 시점에 ID를 부여하는 중앙 통제 방식**을 택했다(`study.txt:826-830`). 클라이언트 쪽에서는 `event.data`가 WebSocket 바이너리 프레임이라 `Blob`으로 오기 때문에, `await event.data.text()`로 문자열로 변환한 뒤에야 `JSON.parse`할 수 있다는 점도 실습 중 부딪힌 함정으로 기록되어 있다(`ver2/web/index.html:273-301`, `study.txt:816-823`의 "메시지의 생애주기" 노트).

---

### 개념 2: Task Distribution (작업 분배 / 경쟁 소비자 패턴)

Pub/Sub이 "1개 메시지를 N명 모두에게" 전달하는 것과 반대로, Task Distribution은 "1개 작업을 여러 워커 중 **정확히 1명**에게" 분배하는 패턴이다(경쟁 소비자, competing consumer). `07-task-distribution`은 SHA1 해시로부터 원문 문자열을 브루트포스로 찾는 무거운 계산을 여러 워커에 분산시키는 예제로, 고전적인 ZeroMQ **Ventilator → Worker → Sink 파이프라인** 구조를 그대로 구현한다.

```js
// chapters/chapter13_messaging-integration/07-task-distribution/producer.mjs:8-13 (ventilator)
const ventilator = new zmq.Push(); 
await ventilator.bind('tcp://*:5016')
const generatorObj = generateTasks(searchHash, ALPHABET, maxLength, BATCH_SIZE)
for(const task of generatorObj){
    await ventilator.send(task)   // round-robin으로 연결된 PULL 소켓에 분배
}
```

```js
// chapters/chapter13_messaging-integration/07-task-distribution/worker.mjs:1-17
const fromVentilator = new zmq.Pull()
const toSink = new zmq.Push()
fromVentilator.connect('tcp://localhost:5016')
toSink.connect('tcp://localhost:5017')

for await (const rawMessage of fromVentilator) {
  const found = processTask(JSON.parse(rawMessage.toString()))
  if (found) {
    await toSink.send(`Found: ${found}`)
    break
  }
}
```

```js
// chapters/chapter13_messaging-integration/07-task-distribution/collector.mjs:1-6 (sink)
const sink = new zmq.Pull()
await sink.bind('tcp://*:5017')
for await (const rawMessage of sink) {
  console.log('Message from worker: ', rawMessage.toString())
}
```

**PUSH/PULL 소켓 타입**은 여러 PULL 소켓이 연결되어 있으면 **라운드로빈으로 작업을 나눠준다** — 이것이 pub/sub(fanout, 모두에게 복제)과 다른, "정확히 1명"을 보장하는 매커니즘이다. `generateTasks.mjs`는 제너레이터로 탐색 공간을 `batchSize`(5000) 단위로 쪼개 하나씩 `yield`하고, `processTask.mjs`는 각 배치를 순회하며 해시가 일치하는 문자열을 찾으면 그 즉시 반환한다.

여기서 `study.txt:488-501`이 짚은 **bind/connect 배치의 실무적 이유**가 중요하다: 얼핏 "PUSH가 서버니까 bind"라고 생각하기 쉽지만, 이 파이프라인에서는 producer(ventilator)와 collector(sink)처럼 **오래 살아있는(durable) 노드에 bind**를 주고, 개수가 늘었다 줄었다 하는 **일시적(transient) worker에 connect**를 준다. 이유는 두 가지다.

1. **방화벽/NAT**: 사설 네트워크의 워커 컴퓨터는 외부에서 `connect`로 찌를 수 없는 경우가 많다(포트 포워딩 필요). 반대로 공인 IP를 가진 서버로 워커가 나가는 연결(outbound connect)을 시도하는 건 방화벽에 걸리지 않는다.
2. **서비스 디스커버리 최소화**: 서버가 bind하면 워커들은 서버 주소 하나만 알면 되지만, 워커가 bind하면 서버가 모든 워커의 IP를 실시간으로 추적/관리해야 한다.

`zeromq-test/` 서브폴더는 이 원리를 최소 예제(`producer.mjs` PUSH-bind, `worker.mjs` PULL-connect)로 단순화해 실험한 흔적이다.

---

### 개념 3: Request/Reply 패턴 — Correlation ID로 비동기 채널을 동기처럼 쓰기

`08-request-reply`는 pub/sub·task-distribution과는 다른 축의 문제를 다룬다: **양방향(duplex) 비동기 채널 위에서, "이 응답이 방금 내가 보낸 요청 A에 대한 답이 맞는가"를 어떻게 식별할 것인가**. HTTP는 요청-응답이 한 커넥션에 묶여 있어 이 문제가 없지만, `child_process.fork()`의 IPC 채널, WebSocket, AMQP 같은 채널은 "보내고 싶을 때 보내고 받고 싶을 때 받는" 구조라서 요청 A/B/C를 순서대로 보내도 응답이 C/A/B 순으로 뒤섞여 돌아올 수 있다(`study.txt:842-846`). 해법은 요청마다 고유한 **Correlation ID**를 붙이고, 응답에는 그 ID를 `inReplyTo`로 되돌려주는 것이다.

예제는 부모-자식 프로세스 IPC 채널로 이를 구현한다.

```js
// chapters/chapter13_messaging-integration/08-request-reply/createRequestChannel.mjs:1-37
export function createRequestChannel(channel){
    const correlationMap = new Map(); 

    function sendRequest(data){
        return new Promise((resolve, reject) => {
            const correlationId = nanoid()
            const replyTimeout = setTimeout(() => {
                correlationMap.delete(correlationId)
                reject(new Error(`Request timed out`))
            }, 10000)

            correlationMap.set(correlationId, replyData => {
                correlationMap.delete(correlationId)
                clearTimeout(replyTimeout)
                resolve(replyData)
            })

            channel.send({ type: 'request', data, id: correlationId })
        })
    }
    channel.on('message', message => {
        const replyCb = correlationMap.get(message.inReplyTo)
        if(replyCb){ replyCb(message.data) }
    })

    return sendRequest; 
}
```

```js
// chapters/chapter13_messaging-integration/08-request-reply/createReplyChannel.mjs:1-15
export function createReplyChannel(channel){
    return function registerHandler(handler){
        channel.on('message', async message => {
            if(message.type !== 'request'){ return }
            const replyData = await handler(message.data)
            channel.send({
                type: 'response', 
                data: replyData, 
                inReplyTo: message.id
            })
        })
    }
}
```

핵심 자료구조는 `correlationMap: Map<correlationId, resolveCallback>`이다. 요청을 보낼 때 `nanoid()`로 ID를 만들어 맵에 "이 ID의 응답이 오면 이 Promise를 resolve하라"는 콜백을 등록해두고, 응답이 `inReplyTo`로 그 ID를 실어서 오면 맵에서 콜백을 찾아 실행한다. 타임아웃도 같은 맵 엔트리에 걸어서 응답이 영영 안 오면 자동으로 reject한다. 이 추상화 덕분에 상위 애플리케이션 코드는 아래처럼 **일반 함수 호출처럼** 보이게 된다(`study.txt:873-880`):

```js
// chapters/chapter13_messaging-integration/08-request-reply/requestor.mjs:1-18
const channel = fork(join(import.meta.dirname, 'replier.mjs'))
const request = createRequestChannel(channel)
try{
    const [message] = await once(channel, 'message')  // 자식이 'ready' 보낼 때까지 대기
    const p1 = request({a: 1, b: 2, delay: 900}).then(res => console.log(`Reply: 1 + 2 = ${res.sum}`))
    const p2 = request({a: 6, b: 1, delay: 100}).then(res => console.log(`Reply: 6 + 1 = ${res.sum}`))
    await Promise.all([p1, p2])
}finally{
    channel.disconnect()
}
```

`p1`(delay 900ms)을 먼저 보내고 `p2`(delay 100ms)를 나중에 보냈지만, `p2`의 응답이 먼저 도착한다 — 바로 이 "응답 순서 뒤섞임"이 correlation ID 없이는 처리 불가능한 상황을 보여준다. 또 하나 주목할 것은 `replier.mjs`가 준비되자마자 `process.send('ready')`를 보내고, 부모가 `await once(channel, 'message')`로 이 신호를 기다린 뒤에야 실제 요청을 보낸다는 점이다 — 자식이 `message` 리스너를 등록하기 전에 부모가 요청을 보내면 그 요청이 유실될 수 있기 때문이며, 이는 "모든 비동기 프로세스 설계의 핵심"이라고 코드 주석에 남겨져 있다(`createReplyChannel.mjs`가 아닌 `replier.mjs:12-16` 주석).

---

### 개념 4: Request/Reply with Return Address — AMQP 회신 큐(익명 exclusive queue)

`09-request-reply-return-address`는 같은 correlation ID 아이디어를 **다중 프로세스, 브로커 기반(AMQP)** 환경으로 확장한다. 자식 프로세스 IPC와 달리 AMQP에는 "요청자가 응답을 어디로 받을지"를 브로커에게 알려줄 방법이 필요한데, 이를 위한 것이 **회신 주소(return address) = 익명의 전용(reply) 큐**다.

```js
// chapters/chapter13_messaging-integration/09-request-reply-return-address/amqpRequest.mjs:8-30
async initialize(){
    this.connection = await amqp.connect('amqp://localhost')
    this.channel = await this.connection.createChannel()
    const {queue} = await this.channel.assertQueue('', {exclusive: true})  // 이름을 안 주면 브로커가 랜덤 생성
    this.replyQueue = queue
    this.channel.consume(this.replyQueue, msg => {
        const correlationId = msg.properties.correlationId
        const handler = this.correlationMap.get(correlationId)
        if(handler){ handler(JSON.parse(msg.content.toString())) }
    }, {noAck: true})
}

send(queue, message){
    return new Promise((resolve, reject) => {
        const id = nanoid()
        const replyTimeout = setTimeout(() => {
            this.correlationMap.delete(id)
            reject(new Error(`Request timed out`))
        }, 10000)
        this.correlationMap.set(id, replyData => {
            this.correlationMap.delete(id)
            clearTimeout(replyTimeout)
            resolve(replyData)
        })
        this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
            correlationId: id, 
            replyTo: this.replyQueue   // "답장은 이 큐로 보내라"
        })
    })
}
```

```js
// chapters/chapter13_messaging-integration/09-request-reply-return-address/amqpReply.mjs:20-34
handleRequests(handler){
    this.channel.consume(this.queue, async msg => {
        const content = JSON.parse(msg.content.toString())
        const replyData = await handler(content)
        this.channel.sendToQueue(
            msg.properties.replyTo,                             // 요청에 실려온 회신 큐로
            Buffer.from(JSON.stringify(replyData)), 
            {correlationId: msg.properties.correlationId}
        )
        this.channel.ack(msg)
    })
}
```

08번과 구조는 동일(`correlationMap` + `nanoid` + 타임아웃)하지만, 채널 자체가 순서를 보장하지 않는 fork IPC와 달리 여기서는 **큐가 두 개** 필요하다는 점이 다르다.

- **요청 큐(`requests_queue`)**: 처리하는 쪽(Replier)이 "나는 이런 일을 처리한다"고 알리기 위해 만드는, 여러 요청자가 공유하는 큐(서비스 창구).
- **회신 큐(익명 `exclusive` 큐)**: 요청하는 쪽(Requestor)이 "답장은 여기로"라고 알리기 위해 매번(또는 초기화 시) 만드는, 자신만의 임시 우편함.

`study.txt:891-900`이 정리한 fanout(방송 모델)과의 대비가 이 구조를 잘 설명한다: fanout은 "큐를 만드는 주체가 항상 수신자(Consumer)"이지만, Request-Reply는 "요청 큐는 처리자가, 회신 큐는 요청자가" 만드는 **양방향 큐 생성**이 필요하다. `requests_queue`로 보낸 메시지에는 `replyTo: this.replyQueue`가 메타데이터로 실리고, Replier는 처리 후 `channel.sendToQueue(msg.properties.replyTo, ...)`로 — AMQP 기본(default) exchange를 통해, 큐 이름과 라우팅 키가 일치하는 큐로 직행하는 단축 경로로 — 정확히 그 요청자에게만 응답을 돌려보낸다. `correlationId`는 한 회신 큐를 여러 요청이 동시에 쓸 수 있으므로(여러 `send()` 호출이 같은 `replyQueue`를 공유) 여전히 필요하다.

또한 요청 큐 선언 시 `{exclusive: true}` 옵션을 주면 Replier 프로세스가 재시작될 때 큐도 함께 사라져서, Requestor의 요청이 아무도 안 듣는 큐로 들어가 타임아웃이 나는 실수를 실습 중 겪었다는 기록이 코드 주석에 남아 있다(`amqpReply.mjs:13-14`) — "큐는 결국 consumer가 소비해야 의미가 있다. requestor가 아무리 큐를 잘 만들어도, replier가 그 큐를 알고 consume하지 않으면 메시지는 쌓이기만 한다"는 원칙(`study.txt:599-603`)을 몸으로 확인한 사례다.

---

### exercise 폴더 — 두 패턴의 실전 응용

**`exercise/multi-chat-redis/ver2`**: `06-chat-redisStream-discern-user`를 그대로 계승해 `senderId` 기반 봉투 패턴(`type: 'ID_ASSIGN' | 'CHAT_MESSAGE'`)을 사용하는 Redis Stream 채팅이다. `STREAM_KEY` 상수(`ver2/index.mjs:16`)로 멀티룸을 준비하던 흔적은 있으나, 실제 `xadd`/`xread` 호출은 아직 `'chat_stream'` 단일 스트림에 고정되어 있어 — 멀티룸 확장은 스트림 키를 방(room)별로 분리하는 리팩터링이 남은 미완성 상태로 보인다.

**`exercise/multi-chat-socket`**: 지금까지의 저수준 `ws` + 수동 브로드캐스트 방식과 달리, **Socket.IO의 룸(room) 기능**으로 동일한 pub/sub 요구사항(단, 이번엔 "채널별" 분리)을 훨씬 적은 코드로 구현한다.

```js
// chapters/chapter13_messaging-integration/exercise/multi-chat-socket/index.js:70-98
socket.on('joinRoom', ({ username, room }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);   // room이라는 채널의 구독자로 등록

    socket.emit('message', { username: 'ChatBot', text: `Welcome to the ${room} room, ${username}!` });
    socket.broadcast.to(room).emit('message', { username: 'ChatBot', text: `${username} has joined the chat.` });
});

socket.on('chatMessage', (msg) => {
    io.to(socket.room).emit('message', { username: socket.username, text: msg });
});
```

`socket.join(room)` / `io.to(room).emit(...)`이 앞서 04-chat-amqp에서 `assertExchange('chat','fanout')` + `bindQueue`로 직접 구현했던 "특정 그룹에게만 방송"을 라이브러리 레벨에서 대신 처리해준다. 다만 이 구현은 단일 프로세스 메모리 내의 room 상태에 의존하므로(01-chat-websocket과 동일한 한계), 서버를 여러 대로 확장하려면 Socket.IO의 Redis Adapter 같은 백플레인(backplane)이 추가로 필요하다 — `study.txt:221-223`에서 "내일 공부할 것"으로 예고한 확장성 주제와 정확히 맞닿아 있다.

---

## 4가지 메시징 패턴 비교표

| 패턴 | 대표 구현체(이 챕터) | 결합도 | 신뢰성/전달 보장 | 메시지 도달 대상 | 언제 쓰는가 |
|---|---|---|---|---|---|
| **Pub/Sub** | WebSocket 로컬 → Redis Pub/Sub → ZeroMQ PUB/SUB → AMQP fanout → Redis Stream | 매우 낮음(발행자가 구독자 수·존재 자체를 모름) | Redis Pub/Sub·ZeroMQ는 약함(오프라인 구독자는 유실), AMQP·Redis Stream은 durable 큐/로그로 강화 가능 | **모든** 구독자(N) | 채팅, 실시간 알림, 이벤트 전파처럼 "누가 듣든 상관없이 방송" |
| **Task Distribution(경쟁 소비자)** | ZeroMQ PUSH/PULL (ventilator→worker→sink) | 낮음(워커 수가 동적으로 늘거나 줄어도 무방) | 워커가 죽으면 처리 중이던 메시지 유실 가능(재시도 로직 직접 구현 필요) | 워커 **1명만**(라운드로빈) | 무거운 계산·작업 큐 분산 처리(브루트포스 탐색, 이미지 인코딩 등) |
| **Request/Reply** | `child_process.fork()` IPC + Correlation ID | 중간(요청자가 처리자의 존재를 알아야 함, 1:1) | 타임아웃으로 실패 감지, 응답 자체는 채널이 끊기면 유실 | 특정 처리자 1명 → 요청자 1명 | 결과를 반드시 받아야 다음 로직을 진행할 수 있는 동기적 호출(주문↔결제, DB 쿼리) |
| **Request/Reply + Return Address** | AMQP 요청 큐 + 익명 exclusive 회신 큐 | 중간(브로커만 알면 되므로 P2P보다 낮음) | 브로커가 durable 큐로 메시지 보관 가능, ack/nack + DLX로 강화 가능 | 특정 처리자 1명 → 요청자 1명(단, 브로커·다중 프로세스 환경에서도 성립) | MSA에서 서비스 간 동기적 RPC를 브로커 위에 올리고 싶을 때 |

---

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가

- **"서버를 2대 이상 띄웠는데 다른 서버 클라이언트에게 이벤트가 전달 안 됨"** — `wss.clients`/Socket.IO 룸처럼 프로세스 로컬 상태에만 의존하고 있지 않은지 확인. `01-chat-websocket`, `exercise/multi-chat-socket`이 겪은 문제와 동일 → Redis pub/sub·AMQP fanout 같은 백플레인 도입이 해법(`study.txt:221-223`).
- **"consumer가 재시작되면 큐가 사라져서 메시지가 안 옴" / "타임아웃만 계속 남"** — `assertQueue`의 `exclusive`/`durable` 옵션 선택이 요구사항과 맞는지 재검토(`09-request-reply-return-address/amqpReply.mjs:13-14` 실수 사례).
- **"consumer 처리 실패가 무한 재시도 루프로 이어짐"** — `channel.nack(msg, false, false)` + DLX(Dead Letter Exchange) 패턴 적용 여부 확인(`04-chat-amqp/dlx-version`).
- **"비동기 채널에서 응답이 요청 순서와 다르게 옴"** — Correlation ID(요청 ID를 응답에 `inReplyTo`/`correlationId`로 되돌려주기) 패턴 적용 여부 확인. `08-request-reply`(IPC), `09-request-reply-return-address`(AMQP)가 참조 구현.
- **"1개 이벤트를 여러 서비스가 각자 처리해야 하나, 1개 작업은 딱 한 워커만 처리해야 하나"** 헷갈릴 때 — 위 비교표에서 Pub/Sub(fanout, N명 모두) vs Task Distribution(PUSH/PULL, 1명만) 구분을 다시 확인.
- **ZeroMQ에서 bind/connect를 어디에 줄지 헷갈릴 때** — "durable한 노드에 bind, transient한 노드에 connect"(방화벽/NAT, 서비스 디스커버리 최소화 관점, `study.txt:488-501`) 원칙을 재적용.
