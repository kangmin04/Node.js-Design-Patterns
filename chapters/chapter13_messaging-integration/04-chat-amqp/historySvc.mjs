import { createServer } from "node:http";
import { Level } from "level";
import { monotonicFactory } from "ulid";
import amqp from 'amqplib'

const ulid = monotonicFactory(); 
const db = new Level('msgHistory', {valueEncoding: 'json'})
const connection = await amqp.connect('amqp://localhost') 
const channel = await connection.createChannel(); 
await channel.assertExchange('chat', 'fanout') /* 외부 rabbitMQ 프로세스에, chat이란 이름의 fanout 방식의 exchange가 존재하는지 확인. 없으면 만들고, 존재하면 넘어감. -> assert인 이유 */
const {queue} = await channel.assertQueue('chat-history', {durable: true}) /* 로그시: { queue: 'chat-history', messageCount: 0, consumerCount: 0 } */
await channel.bindQueue(queue,'chat') // 'chat' exchange에 들어온 모든 메시지를 'history-queue'로 보내도록 바인딩 (fanout 방식이라 모든 메시지를 필터링 없이 보내는 것이기에 routing key등 설정할 필요 없음)
/* queue에 데이터 들어오면, db에 저장하는 로직 */
channel.consume(queue, async (msg) => {
    try{
        const data = JSON.parse(msg.content.toString())
        console.log(`Saving messages: ${msg.content}`)
        await db.put(ulid(), data); //에러 처리 안해도 괜찮나?? level DB에 자동으로 구현되어있는건가?? -> ㅋㅋ 에러 처리 해줘야 함 !!  + 멱등성 보장 고려해봐여함. 
        channel.ack(msg) // msg 객체 내부의 deliveryTag를 이용해 어떤 메시지를 처리했는지 명확히 함. (msg엔 content뿐만아니라, 식별하기위한 deliveryTag 존재함)
    }catch(err){
        console.error(`Failed to process messages: `, err)
        /*
            RabbitMQ의 기본 동작: Consumer가 ack (처리 성공) 또는 nack (처리 실패) 응답을 보내지 않고 그냥 연결이 끊기거나 타임아웃이 되면, 
            RabbitMQ는 "메시지가 처리되지 않은 것 같다"고 판단하고 메시지를 큐에 다시 집어넣습니다 (Requeue).
            -> 계속 DB에러 날 경우, 무한루프로 시스템 마비 가능. 
            해결 ① channel.neck(message, all, requeue) 에서 requeue를 galse로 줄 경우, 이 큐가 문제있으니 다시 큐에 넣지말고 버려달란 뜻 => channel.nack(msg, false, false); 
            BUT 메시지가 영원히 사라지기에 중요 데이터라면 큰 문제
            해결 ② Dead Letter Exchange (DLX)
                - 실패한 메시지만 모아두는 별도의 장소에 저장하는 방법 ! 
                - dlx exchange를 만들고, dlq를 exchange와 비인딩 후, 원래 main queue에 arguments: { 'x-dead-letter-exchange': DLX } 추가하여, 실패한 메시지를 DLX로 가게 설정함.//  

        */
    }
})

createServer((req,res) => {
    //fetch로 chat 과거 데이터 요청 시 
    const url = new URL(req.url, `http:localhost`)
    const lt = url.searchParams.get('lt'); 
    res.writeHead(200, {'Content-Type': 'application/json'})
    const messages = []; 
    for await (const [key, values] of db.iterator({ /* 시간순으로 key에 ulid 저장 -> 대화 기록들이 시간순으로 기록됨. 측, 가장 최근거는 가장 끝이기에, 역순으로 10개를 뽑아서 가장 최근걸 가져옴.  */
        reverse: true, 
        limit: 10, 
        lt
    })){
        messages.unshift({id: key, ...values}) /* 출력순서는 다시 가장 최근게 가장 마지막에 가야하기에, unshift로 가장 앞에 data appending 해줌 */
    }

    res.end(JSON.stringify(messages, null, 2))
}).listen(8090, () => console.log(`chat history-service is running on http://localhost:8090`))