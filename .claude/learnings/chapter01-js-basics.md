# JS 기초 — Node.js Design Patterns 학습을 위한 사전 지식

## 개요
`chapters/jsBasic`은 책의 장 구성과 무관하게, 뒤에 나올 Node.js 디자인 패턴들을 제대로 이해하기 위해 반드시 짚고 넘어가야 하는 JS 기초 4가지(클래스/프로토타입, 클로저, 함수 일급 객체, Promise)를 다룬다. 이 개념들은 각각 책의 특정 패턴과 직결된다 — 클로저는 모듈 패턴·싱글턴·리비링 모듈 패턴의 캡슐화 메커니즘이고, 함수 일급 객체는 전략(Strategy) 패턴·콜백 패턴의 기반이며, Promise/async-await는 책의 비동기 제어 흐름(콜백 지옥 탈출, `Promise.all`을 이용한 무제한 병렬 실행 등) 장의 전제 지식이다. 클래스와 프로토타입 체인은 ES6 클래스 문법 이면의 동작(TDZ, 호이스팅, `new` 연산자의 인스턴스 생성 규칙)을 이해해야 나중에 나오는 믹스인·상속 기반 패턴에서 헷갈리지 않는다. 예제 코드는 대부분 짧고 콘솔 로그 위주의 "직접 실행해보고 확인하는" 실습 스타일이며, 주석에 학습자 본인의 이해(렉시컬 환경, 실행 컨텍스트 등)가 함께 기록되어 있다.

### 클래스와 프로토타입 체인 (TDZ, `new` 연산자)
클래스 선언도 `let`/`const`처럼 **호이스팅되지만 TDZ(Temporal Dead Zone)**에 걸린다는 점을 확인하는 예제다.

```js
// chapters/jsBasic/class/class1.js:1-6
const Person = '' ; 

{
    console.log(Person);  //ReferenceError: Cannot access 'Person' before initialization

    class Person {} //클래스도 호이스팅이 일어난다 ! 
}
```
- 바깥 스코프의 `const Person = ''`이 있음에도, 블록 내부에서 `console.log(Person)`은 `undefined`나 바깥 값이 아니라 **`ReferenceError`**를 던진다.
- 이유: 블록 스코프 안의 `class Person {}` 선언이 그 블록 전체에서 `Person`이라는 이름을 **섀도잉(shadowing)**하고, 클래스 선언은 `var`처럼 `undefined`로 초기화되는 게 아니라 선언부에 도달하기 전까지 TDZ에 머문다. 즉 "호이스팅되지만 사용 불가"라는 `let`/`const`/`class`의 공통 규칙이다.
- 흔한 오해: `class`는 함수 선언처럼 완전히 호이스팅되어 어디서든 호출 가능하다고 생각하기 쉽지만, 실제로는 선언 이전에 참조하면 항상 TDZ 에러가 난다. 이는 이후 챕터에서 클래스를 팩토리 함수나 믹스인과 섞어 쓸 때 "선언 순서" 버그를 피하는 데 중요하다.

`new` 연산자로 클래스를 호출했을 때 인스턴스가 어떻게 만들어지는지는 두 번째 예제에서 확인한다.

```js
// chapters/jsBasic/class/class2.js:1-9
class Person {
    constructor(name,address) {
        this.name = name;
        this.address = address ; 
    } //return {} 하면 this가 무시됨
}

const me = new Person('kim' , 'daegu') ;  //new 연산자로 클래스 호출 시 인스턴스 반환
console.log(me); 
```
- `new Person(...)`은 새 객체를 만들고 `this`를 그 객체에 바인딩한 뒤 `constructor`를 실행하고, 명시적으로 객체를 `return`하지 않는 한 그 `this`를 반환한다.
- 주석("return {} 하면 this가 무시됨")이 핵심 포인트를 짚는다: 생성자에서 **객체를 명시적으로 반환하면 `new`가 만든 `this` 대신 그 객체가 반환**되고, 원시값(문자열/숫자 등)을 반환하면 무시되고 `this`가 그대로 반환된다. 팩토리 함수 패턴에서 클래스 생성자를 흉내 낼 때 이 규칙을 알아야 한다.
- 언제 알아야 하는지: 책 후반부에서 팩토리 패턴과 생성자 패턴을 비교할 때, "왜 어떤 클래스는 `new` 없이도 인스턴스를 반환할 수 있는가"를 설명하는 근거가 바로 이 생성자 반환값 규칙이다.

### 클로저 (Closure)
클로저는 "함수가 자신이 선언된 렉시컬 환경(외부 변수)을 기억하는 것"이다. 즉시실행함수(IIFE)로 private 변수를 흉내 내는 첫 예제부터 본다.

```js
// chapters/jsBasic/closure/closure1.js:1-9
const increase = (function(num){
    let count = 0 ; 
    console.log('num: ' , num)  
    return function(){
        
        return ++count;

    }
}(3))

console.log(increase()); 
console.log(increase()); 
console.log(increase()); 
```
- 바깥 익명 함수는 `(3)`으로 즉시 호출되어 `count = 0`인 렉시컬 환경을 만든 뒤, 내부 함수를 반환하고 소멸한다.
- 반환된 내부 함수는 `increase` 변수에 계속 참조되므로, 바깥 함수의 실행 컨텍스트는 콜 스택에서 pop되어도 **렉시컬 환경(스코프 체인)은 가비지 컬렉션되지 않고 살아남는다**. 이것이 클로저의 본질 — `count`는 사실상 `increase` 함수 전용 private 변수가 된다.
- 파일 안 주석이 직접 이 메커니즘을 정리해 두었다: "즉시실행함수는 소멸되면서 실행 컨텍스트 스택에서 pop되나, `increase` 변수에 여전히 참조되기에 렉시컬 환경이 안 사라짐."
- 흔한 오해: 클로저를 "함수 안에 함수가 있는 것"으로만 이해하기 쉬운데, 핵심은 **내부 함수가 외부 함수 종료 후에도 외부 변수에 접근·갱신할 수 있다는 것**이다. 단순 중첩이 아니라 "생존 기간이 늘어난 스코프 참조"가 핵심.

동일한 아이디어를 여러 메서드가 상태를 공유하는 형태로 확장한 것이 두 번째 예제다 — 이것이 바로 **모듈 패턴(Module Pattern)**의 원형이다.

```js
// chapters/jsBasic/closure/closure2.js:1-12
const counter = (function(){
    let num = 0 ; 

    return {
        inc(){
            return ++num; 
        } , 
        dec(){
            return num > 0 ? --num : 0
        }
    }
}());
```
- `inc`와 `dec` 두 메서드가 같은 클로저(같은 `num` 변수)를 공유한다. 외부에서는 `num`에 직접 접근할 방법이 없고 오직 `counter.inc()`/`counter.dec()`를 통해서만 상태를 변경할 수 있다.
- 이것이 정확히 책에서 다루는 **모듈 패턴/리비링 모듈 패턴**의 기반 메커니즘이다: 클로저로 private 상태를 감추고, 객체 리터럴로 public 인터페이스만 노출한다. Node.js의 CommonJS 모듈 시스템(`require`)도 각 모듈 파일을 함수로 감싸 비슷한 캡슐화를 제공한다는 점을 여기서 미리 익혀두면 이후 모듈 패턴 챕터가 훨씬 쉽게 읽힌다.

클로저를 **고차 함수(함수를 인자로 받는 함수)**와 결합하면 "전략을 주입받는 팩토리"가 된다 — Strategy 패턴의 원형이다.

```js
// chapters/jsBasic/closure/makeCounter.js:1-17
function makeCounter(aux){
    let counter = 0 ; 

    return function(){
        counter = aux(counter); 
        return counter; 
    }
}

function increase(n){
    return n + 1 ; 
}

function decrease(n){
    return n - 1 ; 
}
```
```js
// chapters/jsBasic/closure/makeCounter.js:24-27
const increaser = makeCounter(increase); 
const decreaser = makeCounter(decrease)
```
- `makeCounter`를 호출할 때마다 **독립된 렉시컬 환경**(각자의 `counter` 변수)이 새로 생긴다. 따라서 `increaser`와 `decreaser`는 카운트를 공유하지 않는다 — 공유하려면 `makeCounter`를 한 번만 호출해서 그 결과를 재사용해야 한다(파일 내 주석에서 직접 짚은 포인트).
- `increase`/`decrease`라는 **함수를 인자(전략)로 주입**받아 동작을 바꾸는 구조는 뒤에 나올 Strategy 패턴("알고리즘의 일부를 함수로 분리해 런타임에 교체 가능하게 만든다")과 완전히 같은 형태다. 클로저(상태 은닉) + 고차 함수(행위 주입)의 조합이 바로 이 패턴의 본질이라는 걸 여기서 코드로 먼저 체득한다.
- 언제 다시 봐야 하는가: 나중에 "전략 패턴은 왜 클래스보다 함수 하나로 구현하는 게 JS에서 더 자연스러운가"라는 질문이 나오면 이 예제로 돌아오면 된다.

### 함수 (일급 객체, 즉시실행함수)
`function/index.js`는 짧지만, **named 함수 표현식을 즉시 실행하는 패턴(IIFE)**을 보여준다.

```js
// chapters/jsBasic/function/index.js:1-4
(function add(){
    let a = 3 ; 
    return console.log('a');
}());
```
- 함수에 이름(`add`)을 붙인 함수 표현식을 괄호로 감싸 즉시 호출한다. 이름을 붙이면 함수 내부에서 자기 자신을 재귀 호출할 때 참조할 수 있고, 스택 트레이스에서도 익명 함수보다 디버깅이 쉬워진다는 실무적 이점이 있다.
- 이 파일은 클로저 예제들의 "IIFE" 문법 자체에 집중한 최소 예제로 볼 수 있다 — 함수가 **일급 객체(변수에 담고, 인자로 넘기고, 즉시 호출할 수 있는 값)**라는 전제가 클로저·고차 함수·콜백·전략 패턴 전부의 토대라는 걸 명시적으로 확인해 두는 자리다.
- 언제 알아야 하는지: 책에서 콜백/이벤트 기반 API, 그리고 팩토리 함수를 다룰 때 "함수를 값처럼 다룬다"는 전제가 계속 나오므로, 이 개념이 낯설다면 이 폴더로 돌아와 확인한다.

### Promise 기초
`promise/` 폴더는 여러 개의 소규모 파일로 Promise의 핵심 API와 async/await의 동작 방식을 하나씩 분리해서 실습한다.

**1) 콜백 기반 에러 처리의 한계** — Promise가 왜 필요한지 보여주는 반례.
```js
// chapters/jsBasic/promise/callback_error.js:1-5
// try {
//     setTimeout(() => {throw new Error('error') } , 1000) ; 
// }catch(e) {
//     console.error('에러 : ' , e)
// }
```
- 이 코드는 (주석 처리되어 있지만) 의도가 명확하다: `setTimeout` 콜백 안에서 던진 에러는 **바깥의 `try/catch`로 잡히지 않는다.** 콜백은 이벤트 루프에 의해 나중에, `try` 블록이 이미 종료된 시점에 별도의 스택으로 호출되기 때문이다.
- 흔한 오해: 동기 코드처럼 콜백을 감싸면 에러를 잡을 수 있다고 생각하는 것. 이 한계가 바로 Promise의 `.catch()`/`reject`가 필요한 이유다 — Promise는 비동기 실패를 "값처럼" 전파할 수 있는 통로를 제공한다.

**2) `Promise.resolve`와 thenable** — Promise가 어떤 값이든 통일된 방식으로 감싸는 방법.
```js
// chapters/jsBasic/promise/resolve1.js:1-9
const resolvedPromise = Promise.resolve([1,2,3]); 
resolvedPromise.then(console.log)  

//promise에 promise 전달 -> 전달된 프로미스 그대로 반환
const newPromise = Promise.resolve(resolvedPromise);
newPromise.then(console.log) //
```
```js
// chapters/jsBasic/promise/resolve1.js:11-24
const workingThenable = {
    // 1. then 메서드는 resolve, reject를 인자로 받습니다.
    then: function(resolve, reject) {
        resolve('a')
    }
  };
  
  const promiseFromThenable = Promise.resolve(workingThenable);
```
- `Promise.resolve(value)`는 이미 Promise인 값을 넘기면 **새 Promise로 다시 감싸지 않고 그대로 반환**한다(불필요한 래핑 방지).
- `then` 메서드를 가진 일반 객체(**thenable**)를 넘기면, Promise/A+ 스펙에 따라 그 객체의 `then`을 호출해서 진짜 Promise처럼 동작시킨다. 이는 서드파티 Promise 구현체(jQuery Deferred 등)와 네이티브 Promise를 상호운용시키기 위한 메커니즘이다.
- 언제 알아야 하는지: 책의 비동기 챕터에서 "Promise가 아닌 것도 `await`할 수 있는 이유"를 설명할 때 바로 이 thenable 프로토콜이 근거가 된다.

**3) `Promise.all`을 이용한 병렬 실행** — 책에서 다루는 "무제한 병렬 실행" 패턴의 핵심 API.
```js
// chapters/jsBasic/promise/promiseall.js:1-9
const req1 = () => new Promise(resolve => setTimeout(() => resolve(1) , 1000))
const req2 = () => 
    new Promise(resolve => setTimeout(() => resolve(2) , 1000))
const req3 = () => 
    new Promise(resolve => setTimeout(() => resolve(3) , 1000))
```
```js
// chapters/jsBasic/promise/promiseall.js:28-30
Promise.all([req1(),req2(),req3()]) //
    .then(console.log)
    .catch(console.error)
```
- 파일에는 주석 처리된 대안(순차적으로 `.then()`을 체이닝해서 `req1 → req2 → req3`를 하나씩 기다리는 방식)도 남아 있어, **순차 실행 vs 병렬 실행**을 직접 비교하도록 구성돼 있다. `req1()`, `req2()`, `req3()`를 배열 안에서 즉시 호출하므로 세 타이머가 동시에 시작되고, 모두 1초 후 거의 동시에 끝난다 — 순차 버전이면 총 3초가 걸리지만 `Promise.all` 버전은 약 1초면 끝난다.
- 흔한 오해: `Promise.all([req1, req2, req3])`처럼 함수 자체를 배열에 넣는 실수. 반드시 **함수를 호출해서 얻은 Promise**를 배열에 넣어야 하며, 호출 시점에 이미 비동기 작업이 시작된다는 점(Promise는 "게으르지 않고" 생성 즉시 실행된다)을 함께 기억해야 한다.
- 언제 다시 봐야 하는지: 책의 "여러 비동기 작업을 병렬로 처리하는 패턴" 장에서 이 예제가 최소 재현 코드 역할을 한다.

**4) `.finally()`** — 성공/실패와 무관하게 항상 실행되는 정리 로직.
```js
// chapters/jsBasic/promise/finally.js:21-35
fetchData()
  .then(result => {
    console.log("성공:", result);
  })
  .catch(error => {
    console.error("실패:", error.message);
  })
  //finally- 인자를 받지않는다 ! 단지 프로미스 끝남만을 알림. 
  //finally에서 반환하더라도 그 값은 무시되며 다음 콜백으로 전달 안된다. 
  .finally(() => {
    isLoading = false;
    console.log("작업 완료. (로딩 끝)");
  });
```
- `.finally(callback)`은 **콜백이 인자를 받지 않는다** — 성공값이든 에러든 전달되지 않고, 오직 "체인이 끝났다"는 사실만 알려준다.
- `finally` 콜백에서 값을 `return`해도 **체인의 다음 값에는 영향을 주지 않는다**(단, `finally` 안에서 에러를 던지거나 rejected Promise를 반환하면 그 에러가 새로 전파되는 예외는 있음). 이 예제는 `isLoading` 플래그를 성공/실패 양쪽에서 반드시 꺼주는 전형적인 로딩 스피너 패턴을 보여준다.
- 언제 알아야 하는지: 리소스 정리(로딩 상태 해제, 커넥션 닫기 등)를 `.then`/`.catch` 양쪽에 중복 작성하지 않으려 할 때 이 패턴을 떠올리면 된다.

**5) `Promise.withResolvers()`** — Promise 생성자 스코프 밖에서 `resolve`/`reject`를 제어하는 최신(ES2024) 패턴.
```js
// chapters/jsBasic/promise/withResolvers.js:12-25
function withResolvers() {
    let resolve;
    let reject;
  
    // 1. 프로미스를 생성하면서, 내부의 resolve와 reject를
    //    바깥의 변수에 할당합니다.
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
  
    // 2. 프로미스와 외부로 노출된 함수들을 함께 반환합니다.
    return { promise, resolve, reject };
  }
```
```js
// chapters/jsBasic/promise/withResolvers.js:29-38
async function run() {
    const { promise, resolve } = Promise.withResolvers();
    setTimeout(() => {
      console.log("1초가 지났습니다. 이제 프로미스를 완료합니다.");
      resolve("작업 완료!"); // 외부의 resolve 함수를 호출
    }, 1000);
```
- 원래 `resolve`/`reject`는 `new Promise((resolve, reject) => {...})` 실행자(executor) 함수 스코프 안에서만 접근 가능하다. 이 파일은 먼저 자체 구현(`withResolvers` 함수, "Deferred 패턴")으로 그 한계를 우회하는 방법을 보여준 뒤, **네이티브 `Promise.withResolvers()`**(ES2024에 추가된 정적 메서드)가 동일한 것을 표준 API로 제공한다는 걸 보여준다.
- 이 패턴은 "콜백이 있는 곳"(예: 이벤트 리스너, `setTimeout`)에서 나중에 `resolve`를 호출해 Promise를 완료시켜야 할 때 유용하다 — 콜백 기반 API를 Promise 기반으로 감싸는(Promisify) 전형적인 상황과 정확히 일치한다.
- 언제 알아야 하는지: 책에서 콜백 API를 Promise로 래핑하는 유틸리티를 직접 구현할 때, 실행자 함수 안에 로직을 다 우겨넣지 않고 `resolve`/`reject`를 바깥으로 꺼내 쓰고 싶다면 이 패턴을 쓴다.

**6) async/await의 논블로킹 동작** — `await`가 스레드를 막지 않고 이벤트 루프에 제어권을 넘긴다는 것을 실증.
```js
// chapters/jsBasic/promise/await-nonblocking-demo.mjs:14-32
const main = async () => {
  console.log("메인 함수 시작 🚀");
  const resultPromise = slowTask('A', 2000);
  console.log("'A' 작업을 await 하기 직전입니다. 이벤트 루프는 다른 일을 할 수 있습니다.");

  setTimeout(() => {
    console.log("\n>>> ⏰ 1초 타이머 실행! 'A' 작업은 아직 끝나지 않았습니다.\n");
  }, 1000);

  const result = await resultPromise; // 여기서 실제로 '일시 중지'하며 결과를 기다립니다.
  console.log(`'${result}'를 받았습니다.`);
  console.log("메인 함수 종료 ✅");
};
main();
```
- 이 예제의 목적은 `await`가 **동기적 블로킹이 아니라는 것**을 눈으로 확인하는 것이다: `resultPromise`(2초 소요)를 `await`하는 동안에도 1초짜리 `setTimeout` 타이머가 먼저 실행되어 로그가 끼어드는 걸 볼 수 있다. `await`는 현재 `async` 함수의 실행만 일시 중단시키고, 그 사이 **이벤트 루프는 다른 콜백(타이머, I/O 등)을 계속 처리**한다.
- **주의(코드 결함 발견)**: `slowTask` 내부의 `resolve(...)` 호출이 주석 처리되어 있다(`// resolve(...)`, `await-nonblocking-demo.mjs:9`). 즉 이 Promise는 **영원히 pending 상태**로 남고, `await resultPromise`(line 28) 이후의 `console.log(result)`, `"메인 함수 종료"` 로그는 실제로는 출력되지 않고 프로그램이 멈춘 것처럼 보인다(Node 프로세스는 `setTimeout` 콜백이 남아있는 동안 종료되지 않는다). 이 폴더의 예제를 실제로 다시 돌려볼 계획이라면 `resolve(...)` 주석을 해제해야 의도한 동작(비동기 작업 완료 후 정상 종료)을 확인할 수 있다.
- 언제 알아야 하는지: "async/await은 결국 Promise 위의 문법 설탕이며 싱글 스레드를 막지 않는다"는 것은 책 전체의 비동기 패턴(제너레이터 기반 제어 흐름, async/await 기반 병렬·순차 실행)을 이해하는 데 가장 기본이 되는 전제다.

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가
- **모듈 패턴/싱글턴/리비링 모듈 패턴**을 공부하다가 "private 상태를 어떻게 숨기지?"가 헷갈리면 `closure/closure2.js`(클로저로 객체 메서드가 상태 공유)로 돌아온다.
- **전략(Strategy) 패턴**에서 "함수를 인자로 주입한다"는 게 낯설면 `closure/makeCounter.js`(고차 함수 + 클로저 조합)를 다시 본다.
- **콜백을 Promise로 감싸는(Promisify) 유틸리티**를 직접 작성할 때는 `promise/withResolvers.js`의 Deferred 패턴을, "왜 콜백 안 에러는 try/catch로 못 잡지?"라는 질문에는 `promise/callback_error.js`를 참고한다.
- **여러 비동기 작업을 동시에 실행하는 코드**(무제한 병렬 실행 패턴)를 작성하기 전에 `promise/promiseall.js`로 순차 vs 병렬의 타이밍 차이를 다시 확인한다.
- 클래스 관련 `TypeError`/`ReferenceError`가 나면 `class/class1.js`(TDZ)와 `class/class2.js`(생성자 반환값 규칙)를 먼저 의심한다.
- `promise/await-nonblocking-demo.mjs`는 **`resolve()` 호출이 주석 처리되어 있어 실행하면 멈춘 것처럼 보이는 알려진 결함**이 있다는 것을 기억해 둔다 — 다시 실행해서 확인할 계획이면 그 부분을 먼저 고친다.
