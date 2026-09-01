# Chapter 5 — Promise와 Async/Await

## 개요

이 챕터는 3~4장에서 콜백 기반으로 작성했던 **webspider**(웹페이지를 재귀적으로 다운로드하는 프로그램)를 Promise, 그리고 async/await로 다시 구현하면서 두 스타일의 차이를 체감하는 것이 핵심이다. `promise/spider2 → spider3 → spider4`로 갈수록 "순차 실행 → 완전 병렬(Promise.all) → 동시성 제한(TaskQueue)"으로 진화하고, `async/spider2`는 같은 문제를 async/await로 다시 푼다. 그 외에도 `promisify`(콜백→Promise 변환), `lazyPromise`(즉시실행 vs 지연실행), async 함수의 에러 전파 함정(`return` vs `return await`), 프로미스 체이닝의 메모리 누수 패턴, 그리고 exercise 폴더에서 `Promise.all`과 동시성 제한 큐를 직접 구현해보는 연습까지 이어진다. 이 저장소 코드에는 실습자 본인이 남긴 한국어 주석이 많아, 각 줄에서 "왜 이렇게 동작하는가"를 스스로 검증한 흔적이 남아 있다 — 이 노트는 그 검증 내용을 체계적으로 재정리한 것이다.

### 1. top-level await와 async 함수의 실행 타이밍

**async 함수는 호출되는 즉시 동기 코드처럼 실행되다가 첫 `await`를 만나는 순간 프로미스를 반환하고 제어권을 넘긴다.** `async/delay.mjs`의 주석이 이 동작을 정확히 짚고 있다.

```js
// async/delay.mjs:1-21
function delay(milliseconds) {
    return new Promise((resolve, _reject) => {
      setTimeout(() => {
        resolve(Date.now())
      }, milliseconds)
    })
  }

  async function playingWithDelays() {
    process.nextTick(() => console.log('test code for micro taskqueue'));
    console.log('Delaying...', Date.now()) //execute immediately.

    const timeAfterOneSecond = await delay(1000) //await만나면 playingwDelay함수 자체가 pending promsie를 리턴.

    console.log(timeAfterOneSecond)

    const timeAfterThreeSeconds = await delay(3000)
    console.log(timeAfterThreeSeconds)

    return 'done'
  }
```

그리고 파일 하단에서 `const result = await playingWithDelays()`를 모듈 최상위에서 바로 사용한다 (async/delay.mjs:32-33). 이게 가능한 이유는 **top-level await**(ES2022) 덕분이며, `async/package.json`이 `"type": "module"`이라 `.mjs` 없이도 ESM으로 동작한다. 실행 순서를 추적해보면: ① `process.nextTick` 콜백 예약(마이크로태스크 큐 최우선) → ② `console.log('Delaying...')` 동기 실행 → ③ `await delay(1000)` 도달 시점에 `playingWithDelays()` 자체는 pending 프로미스를 즉시 반환하고, 이 시점에 이벤트 루프로 제어권이 넘어가면서 `nextTick` 콜백이 실행됨 → ④ 1초 뒤 `resolve` → ⑤ 이어서 3초 대기 → ⑥ `'done'` 반환. 파일에는 `.then()` 버전과 `(async () => {...})()` IIFE 버전이 주석 처리되어 남아있어(23-30줄), 학습자가 "top-level await 없이 같은 걸 어떻게 표현하는가"를 직접 비교해본 흔적이다.

- **언제 쓰는가**: 스크립트/모듈 최상단에서 초기화 시퀀스를 기다려야 할 때(설정 로드, DB 연결 등). 라이브러리 코드에는 잘 쓰지 않는다 — 모듈을 import하는 쪽의 실행이 통째로 지연되기 때문.
- **흔한 실수**: `await`를 만나기 전 동기 코드가 "즉시 실행"된다는 걸 놓치고, async 함수가 호출되자마자 완전히 비동기라고 오해하는 것. 실제로는 첫 await 지점까지는 100% 동기다.

### 2. try/catch/finally로 async 에러 잡기 — 동기 에러 vs 비동기(await) 에러

**async 함수 안의 `try/catch`는 `throw`된 동기 에러와, `await`한 프로미스가 reject되는 경우 모두를 잡을 수 있다.** 하지만 두 경우의 타이밍은 다르다.

```js
// async/error.mjs:1-20
function delayError(milliseconds) {
    return new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Error after ${milliseconds}ms`))
      }, milliseconds)
    })
  }

async function playingWithErrors(throwSyncError) {
    try {
      if (throwSyncError) {
        throw new Error('This is a synchronous error') //동기적 에러 -> 즉시 catch로 .
      }
      await delayError(1000)
    } catch (err) {
      console.error(`We have an error: ${err.message}`)
    } finally {
      console.log('Done')
    }
}
```

`throwSyncError`가 true면 `throw`가 즉시 `catch`로 잡히고, false면 `await delayError(1000)`가 1초 뒤 reject되면서 역시 같은 `catch` 블록으로 잡힌다. **await는 "프로미스가 reject되면 그 자리에서 예외를 throw한 것처럼 동작"**하기 때문에 동기 예외와 비동기 예외를 하나의 try/catch로 통일해서 다룰 수 있다는 것이 async/await의 가장 큰 장점 중 하나다. `finally`는 성공/실패 어느 경우든 항상 실행된다.

- **트레이드오프**: 콜백 시절엔 동기 에러(`throw`)와 비동기 에러(`err` 콜백 인자)를 각각 다른 방식으로 처리해야 했는데, async/await는 이 둘을 문법적으로 통합한다.

### 3. `return` vs `return await` — try/catch가 async 함수의 반환 프로미스를 못 잡는 함정

이 챕터에서 가장 중요한 "버그 데모" 쌍이다. `errorAsync.mjs`와 `errorAsyncReturn.mjs`는 코드가 **딱 한 단어(`await`) 차이**인데 동작이 완전히 달라진다.

```js
// async/errorAsync.mjs:9-23
async function errorCaught() {
    try {
       return delayError(1000)  //delayError은 프로미스가 계속 진행 중이고 return을 만나서 errCaught함수는 종료된다.
       //프로미스가 나중에 reject되도 , 그땐 이미 try를 벗어난것. -> caller에서 err이 catch됨.
    } catch (err) {
      console.error('Error caught by the async function: ' +
        err.message) }
  }

  errorCaught()
    .catch(err => console.error('Error caught by the caller: ' +
      err.message))
```

`return delayError(1000)`은 **await 없이** pending 프로미스를 그대로 반환한다. 이 순간 `errorCaught()`의 실행 자체는 즉시 끝나고(try 블록을 "빠져나감"), 나중에 그 프로미스가 reject되어도 이미 try/catch 스코프 밖이므로 함수 내부 `catch`는 절대 실행되지 않는다. 대신 async 함수가 반환한 프로미스 자체가 reject 상태가 되어, **호출자(caller)의 `.catch()`**에서 잡힌다. 콘솔에는 `"Error caught by the caller: ..."`만 찍힌다.

```js
// async/errorAsyncReturn.mjs:12-18
  async function errorCaught() {
    try {
       return await delayError(1000)  //await으로 인해 → Promise가 resolve 또는 reject될 때까지 현재 async 함수가 멈춤
    } catch (err) { //local 내부 에러 catch에서 잡힘.
      console.error('Error caught by the async function: ' +
        err.message) }
  }
```

`return await delayError(1000)`은 함수 실행이 프로미스가 settle될 때까지 **try 블록 안에 머무른다.** 따라서 reject되면 그 즉시 로컬 `catch`가 잡아내고, `"Error caught by the async function: ..."`가 출력된다. (이후 `errorCaught()`가 반환하는 프로미스는 정상적으로 fulfilled 상태가 되므로, 호출자 쪽 `.catch()`는 실행되지 않는다.)

- **핵심 원리**: async 함수는 항상 프로미스를 반환한다(내부에서 값을 리턴하면 `Promise.resolve(값)`로 감싸 반환). **`try` 블록은 그 안에서 실제로 `throw`/`await`-reject가 일어난 코드에 대해서만 동작**하며, `return await` 없이 프로미스를 그냥 반환하면 그 프로미스의 미래 상태는 이미 try 블록의 "책임 범위 밖"이 된다.
- **흔한 실수**: 마지막 줄에서 프로미스를 그대로 `return`하면 성능상 살짝 이득(await 한 틱을 아낌)이라 생각해 습관적으로 `await`를 생략하는 경우가 있는데, try/catch 안에서는 이게 에러 처리 버그로 직결된다. ESLint의 `no-return-await` 규칙과 실제로 상충하는 유일한 예외 케이스가 바로 이 "try 블록 안에서의 return"이다.

### 4. Promise 체인의 재귀적 누적으로 인한 메모리 누수

`infiniteRecurse.mjs`는 **같은 파일 안에** 누수가 나는 버전과 안 나는 버전을 나란히 두고 힙 사용량을 관찰하도록 구성되어 있다.

```js
// async/infiniteRecurse.mjs:9-27
  function leakingLoop() {
    return delay(1)
      .then(() => {
        console.log(`Tick ${Date.now()}`)
        leakingLoop()
      })
  }
  for (let i = 0; i < 1e6; i++) {
    leakingLoop()
  }

  function nonLeakingLoop() {
    delay(1)
      .then(() => {
        console.log(`Tick ${Date.now()}`)
        nonLeakingLoop()
      })
  }
```

두 함수는 거의 똑같아 보이지만 결정적 차이는 **`return`의 유무**다. `leakingLoop`는 `delay(1).then(...)`이 만든 프로미스를 **호출자에게 반환**한다. 이 파일에서는 `for (let i = 0; i < 1e6; i++) { leakingLoop() }`로 무려 100만 개의 독립적인 재귀 체인을 동시에 시작시키는데, 각 체인은 `leakingLoop()`가 반환한 프로미스를 아무도 참조하지 않아도 **내부적으로 계속 새 프로미스를 만들며 체인을 이어가고, 이전 프로미스에 대한 참조가 V8 마이크로태스크 큐/클로저 체인 안에서 계속 살아있어** 힙이 무한히 증가한다. 반면 `nonLeakingLoop`는 `.then()` 체인의 결과를 **반환하지 않는다** — `delay(1).then(...)`을 그냥 "발사하고 잊는(fire-and-forget)" 방식이라, 매 tick마다 이전 프로미스 체인이 온전히 가비지 컬렉션 대상이 될 수 있다. 파일 하단의 `setInterval`로 `process.memoryUsage().heapUsed`를 10ms마다 찍어 실제로 힙이 증가하는지 관찰할 수 있게 해뒀다.

`nonLeaking.mjs`는 같은 문제를 **다른 패턴**으로도 해결할 수 있음을 보여준다.

```js
// async/nonLeaking.mjs:11-22
function nonLeakingLoop(){
    return new Promise((resolve, reject) => {
        (function internalLoop(){
            delay(1)
                .then(() => {
                    console.log('tick ' + Date.now())
                    internalLoop()
                }).catch(err => reject(err))
        })()

    })
}
```

여기서는 외부 `Promise` executor 안에 **내부 IIFE(`internalLoop`)**를 두어, 바깥쪽 `nonLeakingLoop()`가 반환하는 프로미스 자체는 한 번만 생성되고, 실제 반복은 그 executor 내부의 재귀 호출이 담당한다. `internalLoop`가 반환하는 값은 아무도 참조하지 않으므로(단순 함수 호출 표현식) 체인이 누적되지 않는다. `reject`는 `.catch(err => reject(err))`로 바깥 프로미스에 전파해서 에러 핸들링 경로도 확보했다.

- **핵심 원리**: **Promise 체인에서 `.then()`이 반환하는 프로미스를 계속 반환/저장하는 재귀 패턴은 "완료되지 않는 체인"을 만든다.** 이 체인은 이론상 무한히 이어질 수 있고, 각 단계가 이전 단계에 대한 참조를 (엔진 내부적으로) 물고 있어 GC가 회수하지 못한다.
- **언제 조심해야 하는가**: 폴링 루프, 무한 재시도, 워커 루프처럼 "끝나지 않는" 비동기 반복을 Promise로 구현할 때. 반환값을 실제로 아무도 기다리지 않는다면(=`await`하거나 `.then()`으로 연결하는 사람이 없다면) 그 프로미스 체인을 반환/보관하지 말아야 한다.

### 5. 콜백 → Promise 프로미스화 (`promisify`)

Node.js의 전통적인 `(err, result) => {}` 콜백 함수를 Promise 기반 함수로 바꾸는 범용 유틸리티다. `util.promisify`의 축소판을 직접 만들어본 예제.

```js
// promise/promisify.mjs:5-21
function promisify(callbackBasedFn) {
    return function promisifiedFn(...args) {
      return new Promise((resolve, reject) => { // 1. 함수 실행하자마자 즉시 프로미스 생성 및 반환
        const newArgs = [ // 2
          ...args, // 3
          (err, result) => { // 4. 새로운 콜백 추가.
            if (err) {
              return reject(err)
            }
            resolve(result)
          },
        ]
        //randomBytes에 전달할 새로운 arg 만듦.
        callbackBasedFn(...newArgs) // 5. randomButes 실행하고 비동기 작업이 끝나면 저장해둔 err시 reject(err) , fulfill 시 resolve 실행
      })
    }
  }

const randomBytesP = promisify(randomBytes);
randomBytesP(32)
  .then(buffer => { console.log(`생성된 랜덤 바이트: ${buffer.toString()}`); })
  .catch(err => { console.error("에러 발생:", err); });
```

**메커니즘**: `promisify`는 원본 콜백 함수(`callbackBasedFn`, 여기선 `crypto.randomBytes`)를 인자로 받아, 호출 시 ① `args`를 원래 그대로 받고 ② 마지막에 `(err, result) => {...}` 콜백을 하나 더 붙여 ③ 원본 함수를 호출한다. 원본 함수가 이 콜백을 `(err, result)` 형태로 호출해주기만 하면(Node.js 콜백 컨벤션), 그 결과가 `reject`/`resolve`로 자동 변환된다. `promisifiedFn`을 호출하는 순간 `new Promise(...)`의 executor가 **동기적으로 즉시 실행**되므로, 프로미스가 "즉시 시작되는(eager)" 방식이라는 점이 다음 개념(lazy promise)과 대비된다.

`promise/test.mjs`는 같은 아이디어를 극단적으로 단순화한 버전으로, `arg`를 즉시 `resolve`하기만 하는 프로미스 팩토리다(26-32줄). 실제 비동기 작업 없이 "프로미스 생성 자체"의 동작만 관찰하기 위한 최소 예제다.

- **언제 쓰는가**: 레거시 콜백 API를 async/await 코드베이스에 통합할 때. 실무에서는 `node:util`의 `promisify`를 쓰는 게 표준이지만, 내부 동작을 이해하려면 이렇게 직접 구현해보는 게 도움이 된다.
- **트레이드오프**: 이 구현은 콜백이 `(err, result)` 시그니처를 따른다고 가정한다. 여러 값을 콜백으로 반환하는 함수(`(err, a, b)`)나 `err`-first가 아닌 콜백에는 그대로 적용할 수 없다.

### 6. 즉시 실행 Promise vs 지연(Lazy) Promise

일반 `Promise`는 **executor가 생성 즉시 동기적으로 실행**된다. 즉 `new Promise(executor)`를 호출하는 순간 비동기 작업이 "이미 시작"된다. `lazyPromise.js`는 이 기본 동작을 보여준다.

```js
// promise/lazyPromise/lazypromise.js:1-10
const lazyPromise = () => {
   return  new Promise((resolve) => {
        resolve('a');
    })

}

lazyPromise().then(v => console.log(v)) //must invoke function before use then
```

이름은 "lazy"지만 실제로는 **함수 호출(`lazyPromise()`) 시점에 즉시 프로미스가 생성/resolve**된다 — "지연"되는 건 "함수를 호출하기 전까지는 아무 일도 안 일어난다"는 정도의 의미다. 진짜 lazy promise, 즉 **"누군가 `.then()`을 호출하기 전까지는 executor 자체가 실행되지 않는" 프로미스**를 만들려면 `Promise`를 상속해서 `then`을 오버라이드해야 한다.

```js
// promise/lazyPromise/lazypromise_class.js:1-31
export class LazyPromise extends Promise { // 1
    #resolve
    #reject
    #executor
    #promise
    constructor(executor) { // 3
      let _resolve
      let _reject
      super((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
      //super 호출이 끝나야만, this를 사용할 수 있다. !!
      this.#resolve = _resolve
      this.#reject = _reject
      this.#executor = executor
      this.#promise = null
    }
    #ensureInit() { // 4
      if (!this.#promise) {
        this.#promise = new Promise(this.#executor)
        this.#promise.then(
          v => this.#resolve(v),
          e => this.#reject(e)
        )
      }
    }
    then(onFulfilled, onRejected) { // 5
      this.#ensureInit()
      return this.#promise.then(onFulfilled, onRejected)
    }
    catch(onRejected) {
      this.#ensureInit()
      return this.#promise.catch(onRejected)
    }
    finally(onFinally) {
      this.#ensureInit()
      return this.#promise.finally(onFinally)
    }
  }
```

**메커니즘**: `LazyPromise`는 생성자에서 **진짜 `executor`(사용자가 전달한 비동기 작업)를 즉시 실행하지 않고** `#executor` 필드에 저장만 해둔다. 대신 `super()`에는 `resolve`/`reject`를 밖으로 빼내기 위한 빈 executor를 넘긴다(자바스크립트 클래스 문법상 `super()` 호출 전에는 `this`를 쓸 수 없기 때문에, resolve/reject를 지역 변수 `_resolve`/`_reject`에 담았다가 `super()` 이후 `this.#resolve`에 옮기는 우회가 필요하다). 실제 실행은 `#ensureInit()`이 담당하는데, 이 메서드는 **`then`/`catch`/`finally` 중 하나가 처음 호출될 때만** `new Promise(this.#executor)`로 진짜 프로미스를 만들고 그 결과를 바깥 프로미스의 resolve/reject에 연결한다. 즉, **"누군가 결과를 소비하기 전까지는 아무 비동기 작업도 시작되지 않는" 지연 평가(lazy evaluation)** 를 구현한 것이다. 파일 하단(58-68줄)에는 일반 `Promise`가 생성 즉시 `'Executor Started!'`를 출력하는 것과 대비시키는 주석 처리된 비교 코드가 남아있다.

- **언제 쓰는가**: 비용이 큰 비동기 작업(무거운 계산, 네트워크 호출)을 "정말 필요한 시점"까지 미루고 싶을 때, 혹은 캐싱/메모이제이션과 결합해 "한 번도 안 쓰이면 아예 실행 안 되는" 리소스를 만들 때.
- **트레이드오프**: `Promise`를 상속하는 방식은 엔진/런타임에 따라 미묘한 호환성 문제가 있을 수 있고(예: `Promise.resolve()`가 내부적으로 서브클래스를 어떻게 다루는지), 코드가 복잡해진다. 실무에서는 단순히 "함수로 감싸서 호출 시점을 늦추는" 패턴(콜드 함수/thunk)으로 충분한 경우가 많다.

### 7. Promise 체이닝으로 순차 재귀 처리 — spider2 (promise 버전)

콜백 지옥을 Promise 체이닝으로 평탄화한 버전. **링크를 한 번에 하나씩, 순서대로** 처리한다(동시성 1).

```js
// promise/spider2/spider2.mjs:22-34
function spiderLinks(currentUrl, body, maxDepth) {
  let promise = Promise.resolve()
  if (maxDepth === 0) {
    return promise
  }

  const links = getPageLinks(currentUrl, body)
  for (const link of links) {
    promise = promise.then(() => spider(link, maxDepth - 1)) //this takes too much !! . define promise every single iteration , => async await!
  }

  return promise
}
```

**메커니즘**: `promise` 변수를 `Promise.resolve()`(즉시 완료된 빈 프로미스)로 초기화한 뒤, 링크마다 `promise = promise.then(() => spider(link, ...))`를 반복해서 **체인을 동적으로 계속 이어붙인다.** 각 `.then()` 콜백은 이전 링크의 `spider()` 작업이 끝나야만 실행되므로, 결과적으로 링크들이 **순차적으로(직렬로)** 처리된다. 파일 안 주석("this takes too much")은 실습자가 이 방식의 단점 — 링크 수만큼 반복문에서 체인을 새로 만드는 게 비효율적이고 가독성이 떨어진다 — 을 직접 느끼고 async/await의 필요성을 스스로 도출한 기록이다. `spider()` 본문(36-61줄)은 `exists().then(...)`으로 파일 존재 여부를 확인하고, 없으면 `download()` 후 HTML이면 재귀적으로 `spiderLinks()`를 호출하는 구조다.

- **트레이드오프**: 순차 처리라 안전하지만(동시에 너무 많은 요청을 보내지 않음) 느리다 — 링크가 N개면 N배 시간이 걸린다.

### 8. async/await로 다시 쓴 순차 재귀 — async/spider2

같은 순차 처리 로직을 async/await로 다시 쓰면 `for...of` + `await`만으로 표현할 수 있어 훨씬 읽기 쉽다.

```js
// async/spider2/spider2.mjs:24-33
async function spiderLinks(currentUrl, body, maxDepth) {
  if (maxDepth === 0) {
    return ;
  }

  const links = getPageLinks(currentUrl, body)
  for (const link of links) {
   await spider(link, maxDepth -1 )
  }
}
```

**해설**: promise 버전에서 `promise = promise.then(...)`로 수동으로 체인을 이어붙이던 것이, async/await에서는 그냥 **일반적인 `for...of` 루프 안에서 `await`** 하는 것으로 대체된다. 자바스크립트 엔진이 내부적으로 "이전 반복의 await가 끝나야 다음 반복이 시작"되도록 순차성을 보장해주기 때문에, 개발자는 프로미스 체인을 직접 관리할 필요가 없다. `spider()`(35-49줄)도 `if(!(await exists(filename)))`처럼 조건문 안에 `await`를 자연스럽게 섞어 쓸 수 있어, promise 버전의 중첩된 `.then()` 콜백보다 코드가 명령형(imperative) 스타일에 가까워진다.

- **선택 기준**: 로직이 "조건 분기 + 순차 스텝"으로 이루어져 있다면 async/await가 압도적으로 읽기 쉽다. 반대로 "여러 독립적인 프로미스를 동시에 다뤄야 하는" 경우(다음 개념)는 `Promise.all` 등 콤비네이터가 필요하며, 이때도 `await Promise.all(...)`처럼 async/await와 병행해서 쓰는 것이 일반적이다.

### 9. `Promise.all`을 이용한 완전 병렬 처리 — spider3

spider2의 순차 처리를 **한 페이지의 모든 링크를 동시에** 처리하도록 바꾼 버전.

```js
// promise/spider3/spider3.mjs:22-37
function spiderLinks(currentUrl, body, maxDepth) {
  if (maxDepth === 0) {
    return Promise.resolve()
    //spiderLinks에선 항상 프로미스를 반환. 따라서 재귀 종료를 나타내고자 빈 프로미스(완료된)걸 반환
    //그냥 return ; 일 경우, Promise.all이 undefined를받아서 종료됨 .
  }

  const links = getPageLinks(currentUrl, body) ;

  const promises = links.map(link => spider(link, maxDepth - 1));
  //spider은 작업을 기다리는 동기함수가 아님. spider() 호출 즉시, 프로미스 객체를 반환하고 , 실제 비동기 작업은 백그라운드에서 함
  //spider을 호출해서 link1에 대한 작업을 예약해두고 , 해당 접수증인(프로미스 객체)를 받음.
  //즉 promises엔 시작된 각 작업들에 대한 프로미스 객체들이 배열로 담김.
  return Promise.all(promises);
  //모든 프로미스들이 완료 (resolve)되길 기다렸다가 끝나면 , 자신도 resolve되는 새로운 프로미스를 반환.
}
```

**메커니즘**: `links.map(link => spider(link, maxDepth - 1))`이 핵심이다. `spider()`를 호출하는 순간 함수는 **블로킹 없이 즉시 프로미스를 반환**하고(실제 다운로드/파일 I/O는 백그라운드에서 진행), `map`은 이 프로미스들을 배열로 모은다 — 즉 N개의 비동기 작업이 **거의 동시에 "예약"**된다. `Promise.all(promises)`는 배열의 모든 프로미스가 fulfilled될 때까지 기다렸다가, 하나로 합쳐진 새 프로미스를 반환한다(하나라도 reject되면 즉시 그 reject로 자신도 reject된다 — "빨리 실패"). `maxDepth === 0`일 때 `Promise.resolve()`를 반환하는 이유를 주석이 명확히 설명한다: `spiderLinks`는 항상 프로미스를 반환해야 하는 계약이 있는데, 그냥 `return;`(즉 `undefined`)을 반환하면 이 값이 상위의 `Promise.all(promises)` 배열 안에 섞여 들어가도 `Promise.all`은 non-promise 값도 `Promise.resolve()`로 감싸 처리하긴 하지만, 재귀 호출 체인에서 함수의 반환 타입 일관성을 지키기 위한 방어적 코딩이다.

- **트레이드오프**: spider2 대비 훨씬 빠르지만(모든 링크를 동시에 요청), **동시성 제한이 없다** — 페이지에 링크가 수백 개면 수백 개의 요청을 한꺼번에 쏘아버려 대상 서버에 부담을 주거나, 로컬 파일 디스크립터/소켓 리소스를 고갈시킬 수 있다. 이 문제를 해결하는 것이 다음 개념(spider4)이다.

### 10. TaskQueue로 동시성 제한 — spider4 (.then 기반)

"전부 순차(spider2)"와 "전부 병렬(spider3)"의 중간 지점, 즉 **최대 N개까지만 동시에 실행**하는 작업 큐 패턴이다.

```js
// promise/spider4/TaskQueue.js:1-45
import { EventEmitter } from 'node:events'

export class TaskQueue extends EventEmitter {
  constructor(concurrency) {
    super()
    this.concurrency = concurrency
    this.running = 0
    this.queue = []
  }

  pushTask(task) {
    this.queue.push(task) //done => {}을 this.queue 맨뒤에 저장.
    process.nextTick(this.next.bind(this))//현재 실행 중 코드 끝나면 next 시행.
  }

  next() {
    if (this.running === 0 && this.queue.length === 0) {
      return this.emit('empty')
    }

    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()
      task()
        .catch(err => { this.emit('error', err) })
        .finally(() => {
          this.running--
          this.next();
        })

      this.running++
    }
  }

  stats() {
    return { running: this.running, scheduled: this.queue.length }
  }
}
```

**메커니즘**: `TaskQueue`는 `EventEmitter`를 상속해 `'empty'`/`'error'` 이벤트를 발행한다. `pushTask(task)`로 작업(프로미스를 반환하는 함수)을 큐에 넣으면, `process.nextTick`으로 `next()`를 스케줄한다(현재 동기 코드가 다 끝난 뒤 실행되도록). `next()`는 `while (this.running < this.concurrency && this.queue.length > 0)` 조건으로 **동시 실행 중인 작업 수가 concurrency 한도 아래일 때만** 큐에서 작업을 꺼내 실행한다. 각 작업이 끝나면(`.finally()`) `running--` 하고 다시 `next()`를 호출해 **빈 자리를 즉시 채운다** — 이게 바로 "동시성 N개 유지" 알고리즘의 핵심이다. 큐도 비었고 실행 중인 작업도 없으면 `'empty'` 이벤트로 전체 완료를 알린다.

```js
// promise/spider4/spider4.mjs:24-38
function spiderLinks(currentUrl, body, maxDepth, queue) {
  if (maxDepth === 0) { return }
  const links = getPageLinks(currentUrl, body)
  if (links.length === 0) { return }

  for (const link of links) {
    if(!spidering.has(link)){
      queue.pushTask(() => spider(link , maxDepth - 1, queue));
      spidering.add(link);
    }
  }
}
```

`spiderLinks`는 이제 직접 재귀 호출하지 않고, **`queue.pushTask(() => spider(...))`로 작업을 큐에 등록만** 한다. 전역 `Set` `spidering`으로 이미 큐에 넣은 링크를 추적해 중복 방문을 막는다. `spider4-cli.js`는 큐를 만들고(`new TaskQueue(concurrency)`) 최초 작업을 넣은 뒤 `'error'`/`'empty'` 이벤트를 리스닝한다.

- **선택 기준**: 병렬성은 원하지만 리소스 고갈이 걱정될 때 표준적으로 쓰는 패턴. 실무에서는 `p-limit`, `p-queue` 같은 라이브러리가 같은 역할을 한다.

### 11. 같은 TaskQueue를 async/await로 재작성 — exercise/taskqueueAsync02

`spider4/TaskQueue.js`의 `.then().catch().finally()` 체인을 async/await + IIFE(즉시 실행 함수 표현식)로 바꾸면 어떻게 되는지 비교하는 연습이다.

```js
// exercise/taskqueueAsync02/taskqueueAsync.mjs:16-41
  next() {
    if (this.running === 0 && this.queue.length === 0) {
      return this.emit('empty')
    }

    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()
      this.running++

      // We wrap the task execution in an async IIFE (Immediately Invoked Function Expression).
      // This allows us to use await for a single task's lifecycle.
      // Crucially, we DO NOT await this IIFE itself. We fire and forget.
      // This is what allows the while loop to continue and start other tasks concurrently.
      (async () => {     //async 만나면 ... -> 1. 함수 내부 코드 실행 2. 함수 끝나길 기다리자않고 즉시 promise 반환
        try {
          await task()
        } catch (err) {
          this.emit('error', err)
        } finally {
          this.running--
          this.next()
        }
      })()
    }
  }
```

**해설**: `while` 루프 안에서 `async () => {...}` **IIFE를 즉시 실행하되, 그 결과 프로미스를 절대 `await`하지 않는다**("fire and forget"). 이게 핵심 트릭이다 — 만약 여기서 `await`를 걸면 `while` 루프가 한 작업이 끝날 때까지 멈춰버려 동시성이 깨진다. IIFE 내부는 `try { await task() } catch { ... } finally { this.running--; this.next() }`로, `.then().catch().finally()` 체인과 완전히 동일한 의미지만 명령형 문법으로 표현된다. **하나의 태스크 생명주기(성공/실패/후처리)를 순서대로 서술할 수 있다는 게 async/await의 가독성 이점**이고, 반면 "여러 태스크를 동시에 발사한다"는 동시성 자체는 (await하지 않는) fire-and-forget 패턴으로 여전히 명시적으로 다뤄야 한다는 점이 이 비교의 교훈이다.

- **흔한 실수**: `while` 루프 안에서 습관적으로 `await (async () => {...})()`를 붙이면 동시성 큐가 사실상 순차 큐로 퇴화한다. async/await가 "항상 병렬성을 없앤다"는 오해가 여기서 비롯되는데, 실제로는 **await를 어디에 두느냐**가 결정한다.

### 12. 커스텀 `asyncMap` — 동시성 제한 매핑 (`pull` 패턴)

배열의 각 원소에 비동기 콜백을 적용하되, **최대 concurrency개까지만 동시에** 실행하고 **입력 순서를 보존**해 결과를 모으는 유틸리티. `p-map` 라이브러리의 축소 재구현이다.

```js
// exercise/asyncMap03/asyncMap.mjs:1-39
function asyncMap(iterable , callback , concurrency){
    return new Promise((resolve , reject) => {
        const results = [] ;
        const iterator = iterable[Symbol.iterator]();
        let completed = 0 ;
        let index = 0 ;

        function next(){
            const item = iterator.next();
            const currentIndex = index;

            index++;
            if(item.done){
                return ;
            }
            const promise = Promise.resolve(callback(item.value))

            promise.then((res) => {
                results[currentIndex] = res ;
                completed++;

                if(completed === iterable.length){
                    return resolve(results)
                }

                next()
            }).catch(reject)
        }

        for(let i = 0 ; i < concurrency ; i++){
            next()
        }
    })
}
```

**메커니즘**: 이 구현은 **"pull" 방식의 동시성 제어**를 쓴다 — TaskQueue처럼 작업을 미리 큐에 다 넣는 게 아니라, `for(let i=0;i<concurrency;i++) next()`로 **처음에 concurrency개의 "워커"만 시작**시킨다. 각 워커(`next()`)는 이터레이터에서 다음 아이템을 하나 꺼내 처리하고, **자기 작업이 끝나면 스스로 `next()`를 다시 호출**해서 다음 아이템을 당겨온다(pull) — 이게 재귀처럼 보이지만 실제로는 "동시에 실행 중인 워커 수를 항상 concurrency로 유지하는" 루프다. `currentIndex`를 클로저로 캡처해두는 이유가 중요한데, 여러 워커가 동시에 돌기 때문에 `results[currentIndex] = res`로 **입력 순서에 맞는 위치에** 결과를 써야 순서가 뒤섞이지 않는다(완료 순서와 입력 순서가 다를 수 있으므로). `completed === iterable.length`가 되면 전체 완료로 보고 `resolve(results)`.

파일 하단 주석(53줄 이후)에는 실습자가 처음 시도했다가 실패한 버전이 남아있다 — "`next()` 내부에서 결과를 `return`하려 했지만, 가장 바깥 `asyncMap`에서는 그 반환값을 받을 방법이 없다"는 깨달음과 함께, **"왜 다들 `return new Promise(...)`로 함수를 시작하는지 이해가 된다"**는 메모가 있다. 이는 콜백 기반 비동기 로직을 프로미스로 감쌀 때 흔히 거치는 학습 곡선을 잘 보여준다: 비동기 콜백 안의 값은 `return`으로 바깥에 전달할 수 없고, 오직 `resolve`/`reject`를 통해서만 전달할 수 있다.

- **언제 쓰는가**: 배열을 순회하며 각 원소에 비동기 작업(API 호출, 파일 읽기 등)을 걸어야 하는데 전부 동시에 실행하면 안 되는 모든 경우. `Promise.all(arr.map(fn))`은 동시성 무제한, `for...of` + `await`는 동시성 1이라, 그 사이의 "동시성 N"을 원할 때 이런 패턴이 필요하다.

### 13. `Promise.all` 직접 구현해보기 — exercise/dissecting01

Node.js Design Patterns 책의 연습문제("5.1 Dissecting Promise.all()")를 실제로 구현한 코드다. `idea.md`에 실습자의 사전 설계 메모가 남아있다: *"promise.all(arr of promise) -> after every promise is resolve -> return every promise status..... if there's reject -> immediately return false?"*

```js
// exercise/dissecting01/dissecting.mjs:1-20
const pAll = (...list)=> {
    const promise = [];
    let counter = 0 ;
    return new Promise((resolve , reject) => {
      for(let i = 0 ; i < list.length ; i++){
        Promise.resolve(list[i]).then( (res) => {
            promise[i] = res ; //어차피 res는 then내부 -> 이미 완료된 이후 작업이므로 await해도 의미없음
            counter+=1;
        if(counter === list.length){
            resolve(promise) //상태 결정이기에 굳이 return할 필요 없음 .
        }
        }).catch(err => reject(err))
        //for 내라고 여기서 체크 하다가는 .... 안됨. 이땐 프로밋가 실행이 안된거기에 counter은 0이다.

      }
    })
}
```

**메커니즘과 설계 포인트**:
- `Promise.resolve(list[i])`로 각 원소를 감싸는 이유는 **입력이 프로미스가 아닌 일반 값이어도 동작하게** 하기 위함이다(진짜 `Promise.all`도 이렇게 동작한다).
- 결과를 `promise[i] = res`처럼 **인덱스 기반으로 저장**하는 이유는, 각 `.then()` 콜백이 **완료되는 순서가 입력 순서와 다를 수 있기 때문**이다(예: `p2`는 1초, `p4`는 2초 걸리지만 `p1`, `p3`는 즉시 resolve). 인덱스로 저장해야 원래 순서를 보존한 배열을 반환할 수 있다.
- `counter === list.length` 체크를 **`for` 루프 안이 아니라 각 `.then()` 콜백 안에서** 해야 하는 이유를 주석이 정확히 짚었다: `for` 루프는 프로미스들을 "등록"만 할 뿐 동기적으로 즉시 끝나버리므로, 루프가 끝나는 시점엔 `counter`가 아직 0일 수밖에 없다. 완료 여부는 **각 프로미스가 실제로 resolve된 시점**(즉 `.then()` 콜백 내부)에서만 정확히 판단할 수 있다.
- 하나라도 `reject`되면 `.catch(err => reject(err))`가 즉시 바깥 프로미스를 reject시킨다 — 네이티브 `Promise.all`과 동일한 "빨리 실패(fail-fast)" 동작이다.

`test.mjs`는 네이티브 `Promise.all`의 실제 동작을 확인하는 대조군이다.

```js
// exercise/dissecting01/test.mjs:1-19
const p3 = new Promise((resolve , reject) => {
    reject('reject!! donedone')
})
...
const data = Promise.all([p1,p2,p3,p4])

data.then((res) => {
    console.log(res)
}).catch(err => console.log(err))
```

`p3`가 즉시 reject되므로, `p1`/`p2`/`p4`가 fulfilled든 아니든 상관없이 `Promise.all`은 **`p3`의 reject 사유로 즉시 reject**된다(`.then()`은 실행되지 않고 `.catch()`만 실행됨) — `pAll` 구현에서 재현한 것과 동일한 fail-fast 시맨틱이다.

- **트레이드오프**: 이 `pAll` 구현은 all-or-nothing(하나만 실패해도 전체 실패) 시맨틱만 구현했다 — 모든 프로미스의 settle 결과(성공/실패 모두)를 기다리는 `Promise.allSettled`는 별도의 로직(카운터만 늘리고 reject해도 즉시 끝내지 않는 방식)이 필요하다.

## Promise vs async/await 선택 기준

이 챕터의 spider2(promise) ↔ spider2(async) 쌍, 그리고 spider4/TaskQueue ↔ taskqueueAsync02 쌍을 비교하면서 확인한 실전 기준:

- **순차 로직(조건 분기 + 단계별 처리)**: async/await가 압도적으로 읽기 쉽다. promise/spider2의 `promise = promise.then(...)` 누적 패턴은 async/spider2의 `for...of` + `await` 두 줄로 대체된다.
- **여러 프로미스를 동시에 다루는 조합 로직(`all`/`race`/동시성 제한)**: 여전히 `Promise.all`, `Promise.allSettled` 같은 콤비네이터가 필요하다. async/await는 이런 콤비네이터의 결과를 "받아서 기다리는" 문법일 뿐, 병렬 실행 자체를 대체하지는 못한다(`await Promise.all(arr.map(fn))`처럼 항상 함께 쓰인다).
- **에러 처리 일관성**: async/await + try/catch는 동기 에러와 비동기(await) reject를 하나의 문법으로 통합한다(개념 2). 다만 `return` vs `return await`(개념 3)처럼 **try 블록의 "경계"를 정확히 이해하지 못하면 오히려 에러를 놓치는 버그**를 만들기 쉽다 — promise 체인의 `.catch()`는 이런 미묘함이 없다.
- **fire-and-forget이 필요한 동시성 제어(TaskQueue, asyncMap)**: async/await로 구현해도 결국 "이 프로미스는 await하지 않는다"는 결정을 명시적으로 내려야 한다(개념 11). async/await가 코드를 읽기 쉽게 만들어주긴 하지만, 동시성 설계 자체의 난이도를 낮춰주지는 않는다.
- **지연 평가가 필요할 때(lazyPromise)**: 둘 다 근본적으로 Promise executor의 즉시 실행 특성 위에서 동작하므로, async/await 여부와 무관하게 별도의 지연 트리거 설계(클래스 상속 오버라이드, 혹은 단순 팩토리 함수)가 필요하다.

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가

- async 함수 안 `try { return somePromise } catch {...}` 코드를 보거나 작성할 때 — `return await`인지 확인 (개념 3, `errorAsync.mjs` vs `errorAsyncReturn.mjs`).
- 재귀/폴링 형태의 Promise 체인을 작성할 때, 그 체인의 반환값을 계속 어딘가에 반환/저장하고 있는지 점검 — 메모리 누수 패턴(개념 4, `infiniteRecurse.mjs`).
- "동시에 N개까지만" 실행해야 하는 비동기 작업(크롤러, 배치 처리, API 호출 제한)을 설계할 때 — TaskQueue(.then 버전, async 버전) 또는 asyncMap의 pull 패턴을 참고(개념 10~12).
- `Promise.all`/`Promise.allSettled`의 차이가 헷갈릴 때 — `pAll` 직접 구현과 fail-fast 동작 확인(개념 13).
- 콜백 기반 레거시 API를 Promise화해야 할 때 — `promisify` 패턴(개념 5)과 Node.js 콜백 컨벤션(`err`-first)에 대한 가정 확인.
- 순차 vs 병렬 vs 제한된 병렬 중 어떤 걸 골라야 할지 판단이 안 설 때 — spider2/spider3/spider4의 3단계 진화를 다시 훑어볼 것.
