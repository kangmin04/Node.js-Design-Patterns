# Chapter 9 — 행동 패턴 (State, Strategy, Iterator, Command, Middleware)

## 개요

행동 패턴(Behavioral Pattern)은 "객체가 무엇을 할지"보다 "객체 간에 책임과 알고리즘, 요청을 어떻게 나누고 교체 가능하게 만드는가"에 집중한다. 이 챕터는 다섯 가지를 다룬다: **State**는 객체 내부 상태에 따라 동일 인터페이스의 동작을 바꿔 조건문(if/switch) 폭발을 없애고, **Strategy**는 알고리즘 자체를 객체로 뽑아내 런타임에 교체 가능하게 한다. **Iterator**는 컬렉션의 내부 구조를 감추고 순회 방법을 표준화하며(동기/비동기 모두), **Command**는 "실행할 요청" 자체를 객체로 캡슐화해 큐잉·로깅·실행취소(undo)를 가능케 한다. **Middleware**는 여러 처리 단계를 파이프라인으로 조직해 `next()` 호출로 제어권을 넘기는 확장 가능한 아키텍처(Express류)를 만든다. 공통점은 모두 "변하는 부분"을 별도 객체/함수로 뽑아내 컨텍스트(호출부)와 분리한다는 것 — State/Strategy는 구조적으로 거의 동일하지만 의도(상태 전이 캡슐화 vs 알고리즘 교체)가 다르고, Command는 "무엇(what)"을, Strategy는 "어떻게(how)"를 캡슐화한다는 차이가 있다.

---

### 1. State 패턴 (`01-state/tcp/`)

TCP 소켓 연결을 감싸 재연결·큐잉을 자동화하는 `FailsafeSocket` 예제. 소켓이 오프라인/온라인일 때 `send()`의 동작이 완전히 다른데, if문으로 분기하는 대신 **각 상태를 별도 클래스로 만들고 동일한 인터페이스(`send`, `activate`)를 구현**시켜 컨텍스트가 상태 객체에 위임하도록 한다.

```js
// chapters/chapter9_behavioral-patterns/01-state/tcp/failsafeSocket.mjs:1-28
import { OfflineState } from "./offlineState.mjs";
import { OnlineState } from "./onlineState.mjs";

export class FailsafeSocket {
    constructor(options){
        this.options = options ; 
        this.queue = []; 
        this.currentState = null;
        this.socket = null;
        this.states = {
            //failsafesocket의 인스턴스를 직접 전달하면서 constructor의 queue를 offline에서도 사용가능하게함
            offline : new OfflineState(this) , 
            online : new OnlineState(this)
        }

        this.changeState('offline') 
        /* 처음에 offline active호출해서 this.failsafeSocket.socket에 tcp connection 연결 */
    }

    changeState(state){
        console.log(`Activating state: ${state}`)
        this.currentState = this.states[state]
        this.currentState.activate()
    }
    send(data){
        this.currentState.send(data);  /* offline, online 둘다 동일한 인터페이스의드메서드 사용  */
    }
}
```

`FailsafeSocket`(Context)은 자신이 오프라인인지 온라인인지 전혀 모른다 — `this.currentState.send(data)`로 위임할 뿐이다. **상태 객체가 컨텍스트의 참조를 들고 있다가(`this.failsafeSocket`) 스스로 `changeState()`를 호출해 다음 상태로 전이시키는 것**이 이 구현의 핵심 포인트다.

```js
// chapters/chapter9_behavioral-patterns/01-state/tcp/offlineState.mjs:1-32
export class OfflineState {
    constructor(failsafeSocketInstance){
        this.failsafeSocket = failsafeSocketInstance; 
    }
    /* offline 상태이기에 queue에 넣어두고, online state 시 queue에 있던걸 그제야 send!  */
    send(data){
        this.failsafeSocket.queue.push(data); 
    }

    activate(){
        const retry = () => {
            setTimeout(() => this.activate() , 1000)
        }
        ...
        this.failsafeSocket.socket = createConnection(
            this.failsafeSocket.options , () => {
                console.log('Connection established')
                this.failsafeSocket.socket.removeListener('error', retry)
                this.failsafeSocket.changeState('online')   // 상태 스스로 전이 트리거
            }
        )
        this.failsafeSocket.socket.once('error', retry)
    }
}
```

```js
// chapters/chapter9_behavioral-patterns/01-state/tcp/onlineState.mjs:6-33
send(data){
    this.failsafeSocket.queue.push(data); 
    this._tryFlush(); 
}

async _tryFlush(){
    try{
        let success = true 
        while(this.failsafeSocket.queue.length > 0){
            const data = this.failsafeSocket.queue[0] //peak
            const flushed = await this._tryWrite(data); 
            if(flushed){
                this.failsafeSocket.queue.shift(); 
            }else{
                success = false; 
                break; 
            }
        }
        if(!success){
            console.log('Flushing failed -> going offline')
            this.failsafeSocket.changeState('offline')   // 쓰기 실패 시 offline으로 되돌림
        }
    }catch(err){ ... this.failsafeSocket.changeState('offline') }
}
```

`server.mjs`는 이 예제를 실제로 동작시키기 위한 TCP 서버로, **길이 프리픽스 인코딩(length-prefix encoding)** 을 함께 학습한다 — TCP는 스트림이라 메시지 경계가 없기 때문에 4바이트로 이후 메시지 길이를 미리 써서 버퍼를 파싱한다.

```js
// chapters/chapter9_behavioral-patterns/01-state/tcp/server.mjs:14-27
let buffer = Buffer.alloc(0); 
socket.on('data' , chunk => {
  buffer = Buffer.concat([buffer, chunk])
  while(buffer.length >= 4){
      const messageLength = buffer.readUInt32BE(0); 
      if(buffer.length < 4 + messageLength){ return; }
     const message = buffer.subarray(4, 4 + messageLength).toString('utf8')
     console.log('message : ' , JSON.parse(message))
     buffer = buffer.subarray(4 + messageLength);
   }
})
```

`index-idea.mjs`는 실제 구현 전 상태 클래스 설계를 스케치한 초안 — `tcpAvailable`/`tcpUnavailable`처럼 상속으로 공통 인터페이스(`write`)를 표현하는 대안적 접근을 실험한 흔적이다(최종 코드에서는 상속 대신 컴포지션 + 동일 메서드 시그니처를 택함).

**언제 쓰는가**: 객체의 행동이 내부 상태에 따라 근본적으로 달라지고, 상태 전이 규칙이 복잡해질 때(연결 재시도, 워크플로우 단계, 게임 캐릭터 상태 등). **트레이드오프**: 상태 클래스 수만큼 파일/클래스가 늘어나 사소한 상태 기계에는 과할 수 있고, 상태 객체가 컨텍스트를 강하게 참조(순환 참조)하므로 결합도가 생긴다.

---

### 2. Strategy 패턴 (`02-strategy/`)

결제 수단처럼 "같은 목적(pay)을 다른 알고리즘으로 수행"해야 할 때, `if/else if` 사슬 대신 **각 알고리즘을 별도 클래스로 캡슐화하고 컨텍스트에 주입(`setStrategy`)** 한다.

```js
// chapters/chapter9_behavioral-patterns/02-strategy/simpleExample.mjs:22-65
class CreditCardStrategy {
    constructor(name, cardNumber) { this.name = name; this.cardNumber = cardNumber; }
    pay(amount) { console.log(`${amount}원을 ${this.name} 신용카드로 결제합니다.`); }
}
class PayPalStrategy {
    constructor(email) { this.email = email; }
    pay(amount) { console.log(`${amount}원을 ${this.email} 페이팔 계정으로 결제합니다.`); }
}
class ShoppingCart {
    constructor() { this.items = []; this.paymentStrategy = null; }
    addItem(item) { this.items.push(item); }
    setPaymentStrategy(strategy) {  /* 결제 방법에 따라서 다른 strategy Instance -> 다른 payment logic 구현 */
        this.paymentStrategy = strategy;
    }
    checkout() {
        const total = this.items.reduce((sum, item) => sum + item.price, 0);
        if (!this.paymentStrategy) throw new Error("결제 방법이 선택되지 않았습니다.");
        // Context는 구체적인 결제 방법을 모르고, 단지 위임할 뿐입니다.
        this.paymentStrategy.pay(total);
    }
}
```

주석에 명시된 대로, 이 패턴의 동기는 **"유지보수 관점에서 새로운 결제수단 추가 시 else if를 늘리는 대신 새 전략 클래스만 추가하면 되도록"** 하는 것(개방-폐쇄 원칙, OCP). `simpler-example-payment.mjs`는 동일 구조를 카카오페이(`KakaoPayStrategy`)로 반복 연습한 축약 버전이다.

`study.txt`에 정리된 **Strategy vs Command 구분**이 핵심이다:
- Strategy: "어떻게(How)" — 알고리즘 교체가 목적. 예) 서울→부산 이동 시 `KtxStrategy`/`BusStrategy`/`AirplaneStrategy`를 `setStrategy`로 교체.
- Command: "무엇을(What)" — 요청 자체를 객체로 포장해 큐잉/로깅/취소를 가능케 하는 것이 목적.

**언제 쓰는가**: 같은 인터페이스를 유지한 채 알고리즘만 런타임에 바꿔야 할 때(결제, 정렬, 압축, 라우팅 전략 등). **트레이드오프**: State와 구조가 거의 동일해 코드만 보면 구별이 안 될 수 있다 — 차이는 "전이(transition)가 있는가"(State) vs "그냥 교체만 하는가"(Strategy)라는 의도에 있다.

---

### 3. Iterator 패턴 (`03-iterator-pattern/`)

가장 방대한 하위 폴더. **이터레이터 프로토콜을 손으로 구현 → 이터러블 프로토콜 추가 → 제너레이터로 단순화 → 비동기 이터레이터/제너레이터 → 스트림과의 연결**까지 단계적으로 학습한다.

#### 3-1. 이터레이터 프로토콜 직접 구현 (`01-iterator-iterable/`)

`next()`가 `{ value, done }`을 반환하는 객체만 있으면 이터레이터다. 이건 **저수준(low-level) 소비**만 가능하다(`while(!result.done)`).

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/01-iterator-iterable/01-iterator-alphabet.mjs:4-18
function createAlphabetIterator() {
  let currCode = A_CHAR_CODE   // 클로저로 상태(stateful) 보관 -> 외부에서 조작 불가

  return {
    next() {
      const currChar = String.fromCodePoint(currCode)
      if (currCode > Z_CHAR_CODE) { return { done: true } }
      currCode++
      return { value: currChar, done: false }
    },
  }
}
```

`Symbol.iterator` 메서드를 추가해 **이터레이터가 스스로를 반환**하면 이터러블도 되어 `for...of`, 전개 연산자(`...`) 같은 고수준(high-level) 소비가 가능해진다.

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/01-iterator-iterable/02-iterable-alphabet.mjs:17-21
[Symbol.iterator](){
    return this
}
```
(주석: *"이터레이터에 이터러블 구현하는건 권장되는 관행! next 직접 호출로 미세하게 제어 OR for of 둘다 가능함 -> Interoperability 극대화"*)

**2차원 데이터 구조(Matrix)** 를 순회하는 예제로 실전 적용:

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/01-iterator-iterable/03-iterable-matrix.mjs:22-44
[Symbol.iterator]() {
  let nextRow = 0
  let nextCol = 0
  return {
    next: () => {
      if (nextRow === this.data.length) { return { done: true } }
      const currVal = this.data[nextRow][nextCol]
      if (nextCol === this.data[nextRow].length - 1) { nextRow++; nextCol = 0 }
      else { nextCol++ }
      return { value: currVal }
    },
  }
}
```

`04-iterator-prototype.mjs`는 **최신 JS의 `Iterator` 클래스 상속**(빌트인 `Iterator` 전역 — 비교적 신규 기능)을 실험한다. 이를 상속하면 `instanceof Iterator` 판별, `map/filter/take/drop` 같은 헬퍼 메서드, 그리고 `[Symbol.iterator]`가 자동 구현되는 이점이 생긴다.

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/01-iterator-iterable/04-iterator-prototype.mjs:3-27
class RangeIterator extends Iterator {
    #start; #end; #step; #current
    constructor(start, end, step = 1) { super(); ... }
    next() {
      this.#current = this.#current === undefined ? this.#start : this.#current + this.#step
      if (this.#step > 0 ? this.#current < this.#end : this.#current > this.#end) {
        return { done: false, value: this.#current }
      }
      return { done: true }
    }
}
// 지연 평가(lazy) 체이닝 — Array.prototype과 달리 중간 배열을 만들지 않음
const doubledEvenIt = zeroToTenIt.filter(n => n % 2 === 0).map(n => n * 2)
console.log(doubledEvenIt.next()) // { done: false, value: 0 }
```
이는 `Array.prototype.filter/map`의 **즉시 평가(eager)** 방식과 대조된다 — Iterator 헬퍼는 `.next()`가 호출될 때마다 하나씩 지연 계산한다(무한 시퀀스에도 적용 가능). 단, study.txt에 명시된 대로 **"현재 Node에선 Iterator 헬퍼 메서드 적용이 제한적"** 이라는 점도 함께 기록되어 있다.

#### 3-2. 제너레이터로 단순화 (`02-generator/`)

수동으로 `{value, done}` 객체를 만드는 대신 `function*`과 `yield`를 쓰면 엔진이 이터레이터 프로토콜을 대신 구현해준다.

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/02-generator/01-generator-fruit.mjs:1-16
function* fruitGenerator() {
    yield 'peach'
    yield 'watermelon'
    return 'summer'   // done:true 값 -> for...of에서는 출력 안 됨
}
const fruitGeneratorObj = fruitGenerator()   // 즉시 실행 안 함, 제너레이터 객체 반환
console.log(fruitGeneratorObj.next()) // { value: 'peach', done: false }
```

제너레이터는 **양방향 통신**이 가능하다 — `next(arg)`로 값을 generator 내부로 밀어넣거나, `throw()`로 예외를 주입하거나, `return()`으로 즉시 종료시킬 수 있다.

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/02-generator/02-generator-2ways.mjs:1-22
function* twoWayGenerator() {
    try {
      const who = yield null
      yield `Hello ${who}`
    } catch (err) {
      yield `Hello error: ${err.message}`
    }
}
const twoWay = twoWayGenerator()
twoWay.next()
console.log(twoWay.next('world'))   // "Hello world" - next 인자가 이전 yield의 결과값이 됨
console.log(twoWayException.throw(new Error('Boom!')))  // 제너레이터 내부로 예외 주입
console.log(twoWayReturn.return('myReturnValue'))        // 제너레이터 즉시 종료
```

Matrix 예제를 제너레이터로 다시 쓰면 중첩 루프+플래그 관리가 사라지고 코드가 극적으로 단순해진다.

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/02-generator/03-generator-matrix.mjs:20-26
*[Symbol.iterator]() {
  for (const row of this.data) {
    for (const cell of row) {
      yield cell
    }
  }
}
// 주석 처리된 대안: yield* row 로 위임하거나 this.data.flat()으로 더 축약 가능
```

`generator-prac.mjs`는 `yield*`(제너레이터 위임)를 연습한다 — 대상이 제너레이터면 그 실행을 위임하고, 이터러블이면 완전히 소진될 때까지 위임한다. 또한 **"제너레이터는 일회용"** 이라는 함정도 메모되어 있다(한 번 소진된 제너레이터 객체는 재사용 불가, 재순회하려면 새로 호출해야 함).

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/generator-prac.mjs:21-29
function* print(arr){
    yield* arr
}
const printeGenerator = print(array);
for (const val of printeGenerator){ console.log(val) }
const data = [...printeGenerator]   // 이미 소진되어 빈 배열!
```

**비동기 이터레이터를 손으로 구현**한 버전과, **`async function*`로 자동화**한 버전을 나란히 비교하는 것이 이 폴더의 핵심 학습 포인트다. 둘 다 여러 URL의 헬스체크(`fetch HEAD`)를 순회한다.

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/02-generator/04-async-iterator-checkurl.mjs:7-45
[Symbol.asyncIterator]() {
  const urlsIterator = this.#urls[Symbol.iterator]()
  return {
    async next() {                       // next()가 Promise를 반환
      const iteratorResult = urlsIterator.next()
      if (iteratorResult.done) { return { done: true } }
      const url = iteratorResult.value
      try {
        const checkResult = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        return { done: false, value: checkResult.ok ? `${url} is up...` : `${url} is down...` }
      } catch (err) { return { done: false, value: `${url} is down, error: ${err.message}` } }
    },
  }
}
```

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/02-generator/05-async-generator-checkurl.mjs:6-21
async *[Symbol.asyncIterator]() {
  for (const url of this.urls) {
    try {
      const checkResult = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      checkResult.ok
        ? yield `${url} is up, status: ${checkResult.status}`
        : yield `${url} is down, error: ${checkResult.status} ${checkResult.statusText}`
    } catch (err) { yield `${url} is down, error: ${err.message}` }
  }
}
```
두 버전 모두 `for await (const status of checkUrls) { ... }`로 소비된다 — **`async function*`이 `done`/`value` 객체 구성과 Promise 래핑을 자동으로 처리해주는 문법 설탕(syntactic sugar)** 이라는 것이 이 비교의 결론이다.

#### 3-3. 스트림과 이터레이터 (`03-stream-iterator/`)

Node의 Readable 스트림은 내부적으로 `[Symbol.asyncIterator]`를 구현하므로 **모든 readable 스트림은 비동기 이터러블**이다.

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/03-stream-iterator/01-async-iterator.mjs:1-7
import split from "split2";
const stream = process.stdin.pipe(split());
for await (const line of stream) {
    console.log(`You wrote ${line}`);
}
```

`event-to-asyncIterable.mjs`는 이벤트 기반의 **Push 방식**(`emitter.on`)과 `node:events`의 `on()` 헬퍼로 만든 **Pull 방식**(`for await...of`)을 비교한다 — Pull 방식은 콜백 지옥 없이 `async/await`로 이벤트를 순차 소비할 수 있게 해준다.

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/03-stream-iterator/event-to-asyncIterable.mjs:13-26
myEmitter.on('ping', (data) => { console.log('[PUSH]', data); });  // 이벤트 발생 즉시 처리

async function listen(){
    const eventIterator = on(myEmitter, 'ping');    // pull 방식 - 소비 준비될 때 요청
    for await (const [data] of eventIterator){
        console.log('[PULL] ping received : ' , data.timestamp)
    }
}
```

`iterable-to-stream1.mjs`/`2.mjs`는 반대 방향 — **일반 이터러블(배열)이나 비동기 제너레이터를 `Readable.from()`으로 감싸 실제 스트림으로 변환**한다. 비동기 제너레이터 버전은 `flowing mode`에서 자동으로 `generator.next()`를 구동하고, `done:true`가 되면 내부적으로 `push(null)`을 호출해 스트림 종료(`end` 이벤트)를 알린다는 점이 주석으로 상세히 설명되어 있다.

```js
// chapters/chapter9_behavioral-patterns/03-iterator-pattern/03-stream-iterator/iterable-to-stream2.mjs:5-14
async function* generateNumbers() {
  for (let i = 1; i <= 3; i++) {
    await setTimeout(1000);
    yield `Number ${i}`;
  }
}
const asyncStream = Readable.from(generateNumbers());  // 아직 실행 안 됨(lazy)
```

**언제 쓰는가**: 컬렉션/데이터소스의 내부 구조를 감추고 일관된 순회 인터페이스를 주고 싶을 때(자체 자료구조, DB 커서, 대용량 데이터/스트림, 무한 시퀀스). **트레이드오프**: 저수준 구현은 보일러플레이트가 많다(`{value, done}` 수동 관리) → 대부분의 경우 제너레이터로 대체하면 훨씬 간결해진다. 비동기 버전은 백프레셔(backpressure)·타임아웃 관리가 필요해 콜백보다 코드는 깔끔해지지만 에러 전파 지점을 놓치기 쉽다.

---

### 4. Command 패턴 (`command-pattern/`)

"요청(연산)" 자체를 실행 가능한 객체로 캡슐화한다. 전형적인 4역할 구조: **Receiver**(실제 작업 수행자), **Command**(요청을 감싼 객체, `execute()`/`undo()` 보유), **Invoker**(커맨드를 호출/관리), **Client**(커맨드를 만들어 Invoker에 설정).

`ui-example.mjs`는 가장 단순한 형태로, 버튼(Invoker)이 어떤 커맨드를 실행할지 몰라도 되게 만든다.

```js
// chapters/chapter9_behavioral-patterns/command-pattern/ui-example.mjs:1-32
const fileSystem = {  // Receiver
    save: () => console.log('파일을 저장합니다.'),
    delete: () => console.log('파일을 삭제합니다.')
};
class SaveCommand { execute() { fileSystem.save(); } }     // Command
class DeleteCommand { execute() { fileSystem.delete(); } } // Command
class Button {                                              // Invoker
    constructor(label) { this.label = label; }
    setCommand(command) { this.command = command; }
    click() { this.command.execute(); }
}
```

`command-undo-queue-example.js`는 더 발전된 형태로 **undo(실행취소)와 작업 큐(task queue)** 를 함께 구현한다. Undo를 위해 커맨드가 "어떤 연산을 했는지"뿐 아니라 "그 역연산이 무엇인지"까지 알아야 한다는 것이 핵심 설계 포인트다.

```js
// chapters/chapter9_behavioral-patterns/command-pattern/command-undo-queue-example.js:30-56
class CalculatorCommand {
  constructor(calculator, operator, value) {
    this.calculator = calculator; this.operator = operator; this.value = value;
  }
  execute() { this.calculator.execute(this.operator, this.value); }
  undo() {
    const undoOperator = this.getUndoOperator(this.operator);
    this.calculator.execute(undoOperator, this.value);
  }
  getUndoOperator(operator) {
    switch (operator) {
      case '+': return '-'; case '-': return '+';
      case '*': return '/'; case '/': return '*';
    }
  }
}
```

`CommandManager`(Invoker)는 실행 이력(`history`)을 스택처럼 사용해 `undo()`를 지원하고, 별도의 `taskQueue`로 커맨드를 즉시 실행하지 않고 나중에 일괄 처리(`processQueue`)할 수도 있다.

```js
// chapters/chapter9_behavioral-patterns/command-pattern/command-undo-queue-example.js:59-98
class CommandManager {
  constructor() { this.taskQueue = []; this.history = []; }
  executeCommand(command) {
    command.execute();
    this.history.push(command);           // undo를 위한 기록
  }
  undo() {
    if (this.history.length === 0) { ... return; }
    const lastCommand = this.history.pop();
    lastCommand.undo();
  }
  addToQueue(command) { this.taskQueue.push(command); }  // 실행은 미룸
  processQueue() {
    this.taskQueue.forEach(command => { this.executeCommand(command); });
    this.taskQueue = [];
  }
}
```

이 예제는 `+10` → `*5` → undo(`/5`) → undo(`-10`) 순으로 스택 기반 undo가 정확히 역순으로 롤백됨을 실행 시나리오로 보여준다. **핵심 통찰(study.txt)**: Command는 "요청 자체를 객체로 포장"하는 것이 목적이라 큐잉·로깅·지연 실행·취소가 자연스럽게 따라온다 — Strategy가 "알고리즘 교체"에 집중하는 것과 대비된다.

**언제 쓰는가**: 실행 취소/재실행(undo/redo)이 필요하거나, 요청을 큐에 쌓아 나중/비동기로 처리해야 하거나, 요청 자체를 로깅·직렬화해야 할 때(트랜잭션 로그, GUI 액션, 작업 큐/잡 시스템). **트레이드오프**: 모든 연산마다 커맨드 클래스가 필요해 간단한 액션에는 과설계가 될 수 있고, undo 구현 시 역연산을 정확히 정의해야 하는 부담이 있다(위 예제처럼 나눗셈은 부동소수점 오차 위험도 있음).

---

### 5. Middleware 패턴 (`middleware/study.md`)

이 폴더에는 실행 가능한 예제 코드 없이 **개념 정리(`study.md`)만 존재**한다. Express의 미들웨어가 대표 사례로, `function (req, res, next)` 형태의 함수들을 **파이프라인으로 조직**해 요청/응답을 순차 가공한다.

```
// chapters/chapter9_behavioral-patterns/middleware/study.md:1-11
express 에서의 미들웨어 
    - function (req,res,next) 형태
    - 요청과 응답 처리를 위한 파이프라인으로 조직된 서비스들의 집합
    - Intercepting filter pattern , chain of responsibility pattern 적용됨
    - 미들웨어 패턴을 통해 매우 적은 노력 시스템 확장이 가능한 플러그인 인프라 구축 가능 

미들웨어 매니저 
    - 미들웨어 조직 및 실행
    - use() 함수로 새로운 미들웨어 등록(이름은 상관없음) 
    - 새로운 데이터 들어오면 등록된 미들웨어들 비동기적으로 순차 실행, 각 단위는 이전의 실행 결과를 입력으로 받음 
    - next 호출 안하거나 , error 전파하여 중단 가능 
```

정리하면 미들웨어 패턴은 **Intercepting Filter 패턴**과 **Chain of Responsibility 패턴**을 결합한 형태다: `use()`로 처리 단계를 등록하고, 각 단계는 `next()`를 호출해 제어를 다음 단계로 넘기거나, `next(err)`로 에러를 전파해 체인을 중단시킬 수 있다. 각 미들웨어는 이전 단계의 결과(가공된 `req`/`res`)를 입력으로 받으므로 **관심사 분리(로깅, 인증, 파싱 등)를 파이프라인 조합**으로 구현할 수 있다.

**언제 쓰는가**: 하나의 요청/데이터가 여러 독립적인 처리 단계(인증, 로깅, 검증, 변환)를 순서대로 거쳐야 하고, 그 단계 구성을 플러그인처럼 유연하게 추가/제거하고 싶을 때(웹 프레임워크, 데이터 처리 파이프라인). **트레이드오프**: 순서에 의존적이라 미들웨어 등록 순서를 잘못 배치하면 버그로 이어지기 쉽고, `next()` 호출을 빠뜨리면 요청이 영원히 멈추는(hang) 문제가 발생할 수 있다. (주의: 이 챕터 폴더에는 미들웨어 매니저를 직접 구현한 `.mjs`/`.js` 코드가 없으므로, 실습이 필요하면 `use()`/`run()`을 갖는 매니저 클래스를 직접 구현해보는 것이 좋다.)

---

## 5가지 행동 패턴 비교표

| 패턴 | 캡슐화 대상 | 전이(transition) 존재 여부 | 전형적 재사용 시점 | 이 챕터의 대표 예제 |
|---|---|---|---|---|
| **State** | 상태별 행동(동일 인터페이스, 다른 구현) | 있음 — 상태 객체가 스스로 `changeState()` 호출 | 객체 생명주기 동안 내부 상태가 바뀌며 행동이 근본적으로 달라질 때 | `FailsafeSocket`의 `OfflineState`/`OnlineState` |
| **Strategy** | 알고리즘(수행 방식) | 없음 — 외부에서 `setStrategy()`로 교체만 함 | 같은 목적을 여러 방식으로 구현 가능하고 런타임 선택이 필요할 때 | `ShoppingCart`의 `CreditCardStrategy`/`PayPalStrategy` |
| **Iterator** | 순회 로직(내부 구조 접근 방법) | `next()` 호출마다 내부 커서 이동(상태는 있지만 "전이"라기보다 "진행") | 커스텀 자료구조/스트림을 표준 방식(`for...of`, `for await...of`)으로 순회하고 싶을 때 | `Matrix[Symbol.iterator]`, `CheckUrls[Symbol.asyncIterator]` |
| **Command** | 요청(무엇을 할 것인가) 자체 | 없음(단, undo로 "역방향 실행"은 가능) | 실행을 지연/큐잉/로깅/취소해야 할 때 | `CalculatorCommand` + `CommandManager`(undo, queue) |
| **Middleware** | 처리 단계들의 순차 파이프라인 | 없음(단계 간 순서 고정, `next()`로 제어권만 이동) | 하나의 입력이 여러 독립 처리 단계를 순서대로 거쳐야 할 때 | Express 스타일 `use()` 기반 파이프라인(개념 정리만 존재) |

---

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가

- **if/else·switch가 상태 값에 따라 계속 늘어난다** → State 패턴으로 상태별 클래스 분리 검토 (`failsafeSocket.mjs` 참고).
- **결제/정렬/포맷팅처럼 "같은 인터페이스, 다른 알고리즘"을 런타임에 골라야 한다** → Strategy 패턴, `setXxxStrategy()`로 주입.
- **커스텀 자료구조나 대용량/스트리밍 데이터를 `for...of`/`for await...of`로 순회하고 싶다** → `[Symbol.iterator]`/`[Symbol.asyncIterator]`를 직접 구현하기보다 먼저 **제너레이터(`function*`/`async function*`)** 로 단순화할 수 있는지 검토 (`03-generator-matrix.mjs` 비교).
- **실행 취소(undo/redo), 작업 큐, 요청 로깅이 필요하다** → Command 패턴으로 요청을 객체화하고 역연산을 함께 설계.
- **요청/데이터가 여러 독립 단계(인증, 검증, 로깅 등)를 거쳐야 하고 플러그인처럼 확장하고 싶다** → Middleware(Intercepting Filter + Chain of Responsibility) 패턴, `next()`/`next(err)` 제어 흐름 설계.
- **State와 Strategy가 헷갈릴 때** → "객체가 스스로 상태를 전이시키는가?"(State) vs "외부에서 알고리즘만 갈아끼우는가?"(Strategy) 질문으로 구분.
