# Chapter 8 — 구조 패턴 (Proxy, Decorator, Adapter)

## 개요

이 챕터는 **객체 자체의 구조(클래스 정의)는 건드리지 않으면서, 객체와 상호작용하는 방식을 바꾸는 세 가지 패턴**을 다룬다. Proxy는 "원본 객체에 대한 **접근**을 가로채어 제어"하는 데 초점을 두고(검증, 로깅, 캐싱, 지연 생성 등), Decorator는 "원본 객체에 **새로운 기능**을 동적으로 얹는" 데 초점을 두며(OCP — 기존 코드 수정 없이 확장), Adapter는 "서로 호환되지 않는 두 인터페이스를 **번역**"하는 데 초점을 둔다. 셋 다 "원본과 동일하거나 유사한 인터페이스를 가진 wrapper를 만든다"는 표면적 구현 방식은 비슷하지만, **왜 wrapping 하는가**의 의도가 다르다. 특히 이 저장소의 실습은 같은 문제(계산기, 콘솔 로그, 버퍼)를 Composition / Object Literal / Object Augmentation(monkey patching) / ES6 `Proxy` 4가지 구현 기법으로 반복해서 구현해보며, 각 기법의 트레이드오프를 체득하는 데 집중되어 있다.

---

### 개념 1: Proxy 패턴 — 4가지 구현 기법 (계산기 예제)

`01-proxy/01-calculator/` 에서는 `divide()` 호출 전에 "0으로 나누기" 검증을 끼워 넣는 동일한 요구사항을 4가지 방식으로 구현한다.

**(1) Composition — 새 클래스가 원본을 멤버로 소유**
```js
// 01-proxy/01-calculator/01-proxy-composition.mjs:42-71
class SafeCalculator {
    constructor(calculator){
        this.calculator = calculator
    }

    divide() {
        // additional validation logic
        const divisor = this.calculator.peekValue()
        if (divisor === 0) {
          throw new Error('Division by 0')
        }
        return this.calculator.divide(); 
    }
    putValue(value) {
        return this.calculator.putValue(value)
      }
      // ...getValue, peekValue, clear, multiply 모두 동일하게 위임
}
```
가장 안전한 방식. 원본(`calculator`)은 절대 변경되지 않고, `SafeCalculator`가 별도 객체로 존재한다. 단점은 프록시하지 않는 나머지 메서드까지 **일일이 수동으로 위임(delegate)** 코드를 써야 한다는 점 — 원본 인터페이스가 커질수록 보일러플레이트가 늘어난다.

**(2) Object Literal — 팩토리 함수가 클로저로 원본을 참조**
```js
// 01-proxy/01-calculator/02-proxy-literal-remove-redundancy.mjs:3-22
function createSafeCalculator(calculator) {
    const safeCalculator = {
      divide() {
        const divisor = calculator.peekValue()
        if (divisor === 0) {
          throw new Error('Division by 0')
        }
        return calculator.divide()
      },
    }
    // delegated methods
    for (const fn of ['putValue', 'getValue', 'peekValue', 'clear', 'multiply']) {
      safeCalculator[fn] = calculator[fn].bind(calculator)
    }
    return safeCalculator
  }
```
Composition과 개념은 같지만 `class` 대신 팩토리 함수 + 객체 리터럴. 위 코드는 `for...of` 루프로 위임 메서드를 자동 생성해 **중복(redundancy)을 제거**한 개선판이다 (`02-proxy-object-literal.mjs`는 각 메서드를 손으로 나열한 원판). 여기서 `calculator[fn].bind(calculator)`가 핵심 — `this` 컨텍스트를 원본에 고정해야 원본 메서드 내부에서 `this.getValue()` 등이 올바르게 동작한다.

**(3) Object Augmentation (Monkey Patching) — 원본을 직접 수정**
```js
// 01-proxy/01-calculator/03-proxy-augmentation.mjs:10-28
function patchToSafeCalculator(calculator) {
    const divideOrig = calculator.divide 
    calculator.divide = () => {
      const divisor = calculator.peekValue()
      if (divisor === 0) {
        throw new Error('Division by 0')
      }
      // this context 유지 위해 apply(calculator) 필수
      return divideOrig.apply(calculator)
    }
    return calculator
  }
```
원본 메서드를 임시 변수(`divideOrig`)에 백업한 뒤, 원본 객체의 프로퍼티 자체를 새 함수로 덮어쓴다. 프록시하고 싶은 메서드가 1~2개뿐일 때는 가장 간결하지만, **원본 객체를 직접 변형**하므로 그 객체를 참조하는 다른 코드 전체에 부작용을 준다 — study.txt에서도 "절대 일반 애플리케이션 로직에 사용해서는 안 됨"으로 못 박고, 테스트 모킹/수정 불가능한 외부 라이브러리 패치 같은 최후의 수단으로만 허용한다.

**(4) ES6 `Proxy` 객체 — get 트랩으로 가로채기**
```js
// 01-proxy/01-calculator/04-proxy-object-safe-calculator.mjs:3-18
const proxyhandler = {
    get : (target , property) => {
        if(property === 'divide'){
            if(target.peekValue() === 0){
                throw new Error('Dividor is not allowed 0')
            }
            return target.divide()
        }
        return target[property]; 
    }
}
const safeCalculator = new Proxy(calculator , proxyhandler)
```
언어 차원에서 지원하는 방식. `get` 트랩 안에서 `target.divide()`를 **직접(target을 통해)** 호출하기 때문에 프록시를 다시 거치지 않아 무한 재귀에 빠지지 않는다 (만약 `safeCalculator.divide()`처럼 프록시를 통해 재호출했다면 `get` 트랩이 다시 걸려 무한루프). 위임 코드가 전혀 필요 없다는 게 가장 큰 장점 — `return target[property]`가 나머지 모든 메서드를 자동으로 통과시켜준다.

**트레이드오프 정리**: Composition/Object Literal은 안전하지만 장황하고, Augmentation은 간결하지만 위험하며, ES6 `Proxy`는 안전함(원본 불변) + 간결함(자동 위임)을 동시에 얻는 최선의 선택이다. 다만 트랩 로직이 모든 프로퍼티 접근에 개입하므로 트랩 자체의 로직이 복잡해지면 디버깅 난이도가 올라간다는 점은 감안해야 한다.

---

### 개념 2: Proxy 패턴 — ES6 `Proxy` 트랩 심화 (스트림 로깅 / 반응형 객체 / 트랩 실험)

**로깅 Writable 스트림 프록시** — `write` 호출만 가로채 콘솔에 찍고, 나머지는 그대로 통과:
```js
// 01-proxy/02-proxy-object/01-logging-writable/loggingWritable.mjs:1-15
export function createLoggingWritable(writable){
    return new Proxy(writable , {
        get(target,propKey , _receiver){
            if(propKey === 'write'){
                return(...args) => {
                    const [chunk] = args; 
                    console.log(chunk)
                    return writable.write(...args)
                }
            }
            return target[propKey]; 
        }
    })
}
```
`index.mjs`에서 `writableProxy.write(...)`는 로그가 찍히지만 `writable.write(...)`(원본을 직접 호출)는 로그가 찍히지 않는 것으로 검증한다 — 프록시는 **자신을 거쳐온 호출만** 가로챈다는 것을 명확히 보여주는 예제.

**반응형(Observable) 객체** — `set` 트랩으로 값 변경을 감지해 옵저버에 알림:
```js
// 01-proxy/02-proxy-object/02-proxy-reactive/create-observable.mjs:1-14
export function createObservable(target , observer){
    const observable = new Proxy(target , {
        set(obj , property , value){
            if(obj[property] !== value){
                const prev = obj[property]; 
                obj[property] = value; 
                observer({property , prev , curr : value})
            }
            return true; 
        }
    })
    return observable ;
}
```
`invoice.mjs`에서 청구서 합계(`calculateTotal`)를 자동 재계산하는 데 사용 — `subtotal`, `discount`, `tax` 중 하나라도 바뀌면 `observer` 콜백이 실행되어 `total`을 갱신한다. 값이 **실제로 바뀔 때만**(`obj[property] !== value`) 알림을 보내 불필요한 재계산을 막는 최적화가 들어있다. `set` 트랩은 반드시 `true`(성공)를 반환해야 하며, 그렇지 않으면 strict mode에서 `TypeError`가 발생한다는 점도 `trap-test.mjs`에서 명시적으로 확인한다.

**트랩 실험 스크립트** — `get`/`set`/`deleteProperty` 세 트랩의 시그니처와 반환값 규칙을 직접 실험:
```js
// 01-proxy/02-proxy-object/trap-test.mjs:7-27
let handler = {
    get(target , property){ return target[property] } , 
    set(target , property , value){
        target[property] = value; 
        return true //값을 성공적으로 쓴 경우 -> true를 반환해야함. 
    } , 
    deleteProperty(target , property) {
        console.log('you are deleting user name')
        return true
    }
}
```
`get`은 반드시 값을 `return`해야 하고, `set`/`deleteProperty`는 반드시 `boolean`을 반환해 성공 여부를 알려야 한다는 ES2015 Proxy 스펙의 핵심 계약을 익히는 스크립트. 실무에서 커스텀 트랩을 쓸 때 이 반환값 규칙을 빠뜨리면 조용히 동작이 깨지거나 strict mode 에러가 나므로 반드시 기억해야 한다.

**Proxy 패턴 사용 시점 / 트레이드오프**: 접근 제어(검증), 로깅, 캐싱, 지연 초기화(lazy init), 반응형 데이터 바인딩처럼 "원본에 대한 **접근 자체**를 통제"해야 할 때 사용한다. ES6 `Proxy`는 강력하지만 트랩이 모든 프로퍼티 접근 경로에 끼어들기 때문에 성능이 민감한 hot path에서는 오버헤드를 고려해야 하고, 트랩 안에서 원본(`target`)을 직접 호출하는지 프록시(`receiver`)를 통해 재귀 호출하는지 항상 구분해서 코드를 짜야 한다(무한루프 방지).

---

### 개념 3: Decorator 패턴 — 3가지 구현 방식 (계산기 `add` 기능 추가)

`02-decorator/`는 Proxy 챕터와 똑같은 `StackCalculator`에 **새 메서드 `add()`를 추가**하는 문제로 세 가지 구현을 비교한다 (Proxy가 "검증"이었다면 Decorator는 "기능 확장"이라는 목적 차이를 보여주는 설계).

**(1) Composition 기반 데코레이터**
```js
// 02-decorator/01-decorator-composition.mjs:33-71
class EnhancedCalculator {
    constructor(calculator) {
      this.calculator = calculator
    }
    // new method
    add() {
      const addend2 = this.getValue()
      const addend1 = this.getValue()
      const result = addend1 + addend2
      this.putValue(result)
      return result
    }
    // modified method
    divide() {
      const divisor = this.calculator.peekValue()
      if (divisor === 0) {
        throw new Error('Division by 0')
      }
      return this.calculator.divide()
    }
    // delegated methods: putValue, getValue, peekValue, clear, multiply ...
  }
```
새 메서드(`add`)는 자유롭게 추가하고, 기존 메서드(`divide`)는 필요하면 오버라이드하며, 나머지는 원본으로 위임 — Decorator가 "원본과 동일한 인터페이스 + 추가 기능"을 제공한다는 정의를 그대로 코드로 보여준다.

**(2) Object Augmentation 기반 데코레이터**
```js
// 02-decorator/02-decorator-object-augmentation.mjs:3-24
function patchDecorator(calculator){
    calculator.add = () => {
        const addend2 = calculator.getValue()
        const addend1 = calculator.getValue()
        const result = addend1 + addend2
        calculator.putValue(result)
        return result
    }
    const divideOrigin = calculator.divide ; 
    calculator.divide = () => {
        if(calculator.peekValue === 0){ // 주의: peekValue "함수 참조" 자체와 비교 — 버그성 코드(peekValue() 호출 누락)
            throw new Error('Division by 0')
        }
        return divideOrigin.apply(calculator)
    }
    return calculator
}
```
Proxy 챕터의 augmentation과 동일한 원리: 원본 메서드를 백업(`divideOrigin`) 후 덮어쓰기, `apply(calculator)`로 `this` 유지. **주의점**: 코드에 `calculator.peekValue === 0` 로 함수 참조와 숫자를 비교하는 실수가 있는데(`peekValue()` 호출이 빠짐) — augmentation 방식이 왜 위험한지(디버깅하기 어려운 조용한 버그)를 역설적으로 보여주는 실습 코드다.

**(3) ES6 `Proxy` 기반 데코레이터**
```js
// 02-decorator/03-decorator-proxy-object.mjs:3-28
const enhancedCalculatorHandler = {
    get(target , property){
        if(property === 'add'){
            return function add(){
                const add1 = target.getValue(); 
                const add2 = target.getValue(); 
                const result = add1 + add2;
                target.putValue(result); 
                return result;
            }
        }
        if(property === 'divide'){
            return () => {
                const divisor = target.peekValue()
                if (divisor === 0) { throw new Error('Division by 0') }
                return target.divide()
            }
        }
        return target[property]
    }
}
const enhancedCalculator = new Proxy(calculator, enhancedCalculatorHandler)
```
원본에 없던 `add`라는 프로퍼티 이름을 `get` 트랩에서 가로채 **완전히 새로운 함수를 반환**한다는 점이 흥미롭다 — Proxy가 "존재하지 않는 프로퍼티도 있는 것처럼 흉내 낼 수 있다"는 것을 보여준다. 이는 뒤에 나오는 `exercise/03-colorlog`의 "존재하지 않는 색상 메서드를 흉내 내는" 응용과 직결된다.

**실전 사례 — LevelDB에 pub/sub 스타일 `subscribe` 데코레이팅**
```js
// 02-decorator/level/level-subscribe.mjs:1-19
export function levelSubscribe(db){
    db.subscribe = (pattern , listener) => {
        db.on('write' , docs => {
            for (const doc of docs){
                const match = Object.keys(pattern).every(
                    k => pattern[k] === doc.value[k]
                )
                if(match){
                    listener(doc.key, doc.value) 
                }
            }
        })
    }
    return db; 
}
```
```js
// 02-decorator/level/index.mjs:6-12
const db = new Level(dbPath, { valueEncoding: 'json' })
levelSubscribe(db) //return subscribe method 포함된 db 리턴
db.subscribe(
    {doctype : 'message' , language : 'en' } , 
    (_key , value) => console.log(value)
)
```
LevelDB의 `write` 이벤트를 기반으로 "패턴 매칭 구독" 기능을 원본 `db` 인스턴스에 augmentation 방식으로 얹은 실전 예제. 책에서 언급하는 "실무에서는 순수함보다 실용성이 우선될 수 있다"는 관점을 보여주는 사례 — DB 라이브러리처럼 여러 곳에서 공유되는 싱글턴 인스턴스에 기능을 얹을 때는 augmentation이 실용적 선택이 되기도 한다(다만 여전히 전역 상태 오염 위험은 있음).

**Decorator 사용 시점 / 트레이드오프**: OCP(개방-폐쇄 원칙)를 지키며 기존 객체에 새 책임을 동적으로 추가해야 할 때 사용한다. study.txt에 정리된 대로 여러 데코레이터를 겹겹이 쌓을 수 있다는 게 큰 장점:
```
const calculator = new StackCalculator();
const securedCalculator = new SecurityDecorator(calculator); // 1차 포장
const loggedCalculator = new LoggingDecorator(securedCalculator); // 2차 포장
loggedCalculator.add(3, 5);
```
Proxy와의 핵심 차이는 **의도**다 — Proxy는 "접근 제어/가로채기"가 목적이고 Decorator는 "기능 확장"이 목적이다. 구현 메커니즘(composition, augmentation, ES6 Proxy)은 두 패턴이 완전히 겹친다는 점이 이 챕터의 중요한 통찰이다.

---

### 개념 4: Adapter 패턴 — `fs` Promise API를 LevelDB API로 변환

**Adaptee(LevelDB)를 Target 인터페이스(`fs/promises`)에 맞추는 어댑터**
```js
// 03-adapter/fs-adapter.mjs:9-33
export function createFSAdapter(db){
    return {
        async readFile(filename , options = undefined){ 
            let valueEncoding = typeof options === 'string'  ? options : options?.encoding;
            const option = valueEncoding ? {valueEncoding} : undefined; 
            const value = await db.get(resolve(filename) , option)
            if(typeof value === 'undefined'){
                const e = new Error(
                    `ENOENT: no such file or directory, open '${filename}'`
                  )
                  e.code = 'ENOENT'
                  e.errno = 34
                  e.path = filename
                  throw e
            }
            return value; 
        } , 
        async writeFile(filename , contents , options){
            let valueEncoding = typeof options === 'string'  ? options : options?.encoding;
            const option = valueEncoding ? {valueEncoding} : undefined; 
            await db.put(resolve(filename) , contents, option)
        }
    }
}
```
파일 상단 주석이 Adapter 패턴의 세 역할을 정확히 정의한다:
```js
// 03-adapter/fs-adapter.mjs:2-5
/*
    client - 작업 요청하는 코드 (클라이언트는 타켓 인터페이스에 맞게 구현되어있음) - fs promise
    Adaptee - 타켓인터페이스와 호환되지않는 인터페이스를 가짐. - level db
    Adapter - 클라이언트와 어댑티를 호환시켜줌. -구현할 createFSAdapter
*/
```
`readFile(filename, options)`은 `db.get(key, options)`로, `writeFile`은 `db.put(key, value, options)`로 매핑한다. 두 가지 세부 처리가 핵심 학습 포인트다:
1. **옵션 정규화**: `fs` API는 `options`가 문자열(`'utf8'`)이거나 객체(`{encoding: 'utf8'}`)일 수 있는데, 이를 LevelDB가 요구하는 `{valueEncoding}` 형태로 통일해서 넘긴다.
2. **에러 시맨틱 변환**: LevelDB는 키가 없으면 그냥 `undefined`를 반환하지만, `fs`는 `ENOENT` 에러(코드/errno/path 포함)를 던진다. 어댑터가 이 차이를 흡수해 클라이언트 입장에서는 "진짜 fs처럼" 동작하게 만든다.

```js
// 03-adapter/index.mjs:5-13
const db = new Level(join(import.meta.dirname, 'db'), { valueEncoding: 'binary' })
const fs = createFSAdapter(db); 
await fs.writeFile('file.txt', 'Hello!_adapter', {encoding : 'utf8'})
const res = await fs.readFile('file.txt', 'utf8')
console.log(res)
await fs.readFile('missing.txt') // ENOENT 에러로 fs와 동일하게 동작
```
`01-basic-fs-test.mjs`가 실제 `node:fs/promises`로 동일한 시나리오(`writeFile` → `readFile` → 존재하지 않는 파일 `readFile`)를 실행해 두는데, 이는 어댑터가 목표로 하는 "원본 API와 동일한 동작"을 대조군으로 검증하기 위한 스크립트다.

**Adapter 사용 시점 / 트레이드오프**: 레거시 코드나 서드파티 라이브러리처럼 **수정할 수 없는 기존 인터페이스**를, 클라이언트가 기대하는 다른 인터페이스로 맞춰야 할 때 사용한다. Proxy/Decorator가 "동일한 인터페이스를 유지"하는 것과 달리, Adapter는 애초에 **다른 인터페이스를 갖는 두 시스템을 이어주는 번역 계층**이라는 점이 본질적 차이다. 트레이드오프는 어댑터 레이어가 두꺼워질수록(모든 엣지 케이스, 에러 시맨틱, 옵션 형식을 다 흡수해야 하므로) 유지보수 부담이 커진다는 것.

---

### 개념 5: 연습문제 (exercise/)

**5-1. HTTP 캐싱 프록시 (`exercise/01-http-cache/index.mjs`)** — 같은 URL로 두 번째 요청 시 실제 네트워크 호출 없이 캐시에서 즉시 반환:
```js
// exercise/01-http-cache/index.mjs:17-24
function createRequest(url , cb){
  if(cache.has(url)){
    return process.nextTick(() => {
        console.log('[From Cache]')
        cb(cache.get(url))
    })
  }
  // ... 캐시 미스 시 실제 http.request 수행 후 cache.set(url, bodyData)
```
Node 콜백 API를 다루므로, 캐시 히트 시에도 **동기적으로 콜백을 바로 부르지 않고 `process.nextTick`으로 감싼다** — 이는 "함수는 항상 동기 또는 항상 비동기 중 하나로 일관되게 동작해야 한다"(Zalgo 방지, 책의 앞 챕터에서 다룬 원칙)를 실천한 코드다. 주석에서도 스스로 "proxy는 클라이언트 관점, `req.on/res.on`은 서버로부터 받는 응답 스트림 처리"임을 정리해두었다.

**5-2. 콘솔 로깅 — Composition vs Proxy 비교 (`exercise/02-consoleLogging/`)**
```js
// exercise/02-consoleLogging/index-composition.mjs:1-14
class ProxyLog {
    constructor(console){ this.console = console }
    log(arg){
        let day = new Date(); 
        return this.console.log( `[${day}] ${arg}`)
    }
    info(arg){ /* 동일 패턴 */ }
}
```
```js
// exercise/02-consoleLogging/index.mjs:3-15
const loggingHandler = {
    get(target , property ){
        if(typeof target[property] === 'function'){
            return function(...args){
                const timeStamp = new Date().toISOString();
                target[property](`${timeStamp}` , ...args)
            }
        }
        return target[property];
    }
}
const createLogProxy = new Proxy(console , loggingHandler )
```
Composition 버전은 `log`, `info`만 명시적으로 감쌌기 때문에 `console`의 다른 메서드(`error`, `debug`, `warn`, `table` 등)는 지원하지 못한다. Proxy 버전은 `typeof target[property] === 'function'`으로 **"함수인 모든 프로퍼티"를 일괄 처리**해 `console`의 모든 메서드에 타임스탬프를 자동으로 붙인다 — 인터페이스가 크거나 알 수 없을 때 Proxy가 압도적으로 유리하다는 것을 보여주는 좋은 대조 예제.

**5-3. 컬러 로그 — Proxy로 "존재하지 않는 메서드" 흉내 내기 (`exercise/03-colorlog/`)**
```js
// exercise/03-colorlog/index-proxy-object.mjs:3-19
const proxyLog = new Proxy(console , {
    get(target , property){
        if(target[property] === undefined){  //Non Predefined Method 
            if(property in styles){ //color property
                return function(text){
                    target.log(`${styles[property].open}${text}${styles[property].close}`)
                }    
            }
            return function(){
                console.log('WRONG METHOD FOR CONSOLE' )
            }
        }
        return target[property].bind(console)
    }}
)
proxyLog.red('hi~')     // ansi-styles의 red 스타일 적용
proxyLog.dsds('test')   // 정의되지 않은 색상 -> 'WRONG METHOD FOR CONSOLE'
```
`console`에는 원래 `red`, `yellow`, `green` 같은 메서드가 없다. `get` 트랩이 "요청된 프로퍼티가 `console`에 없고(`undefined`), `ansi-styles` 패키지의 색상 이름에 존재하면" 그 자리에서 컬러 출력 함수를 **동적으로 만들어 반환**한다 — 개념 3(Decorator의 `add` 메서드 흉내)과 동일한 기법이 색상이라는 다른 도메인에 재사용된 사례. 대조군인 `index.mjs`(augmentation 방식)는 전역 `console` 객체에 `console.red = ...` 식으로 직접 프로퍼티를 박아 넣는데, 파일 맨 위 주석에 스스로 "전역 객체인 console에 직접 수정 → 좋은 코드 아님, 프록시가 더 이상적"이라고 결론을 적어두었다.

**5-4. Lazy Buffer — 지연 생성 가상 프록시 (`exercise/lazyBuffer05/`)**
```js
// exercise/lazyBuffer05/index-improve.mjs:1-40 (최종 개선판)
function createLazyBuffer(size) {
    let buffer = null;
    let offset = 0;
    const ensureBuffer = () => {
      if (!buffer) { buffer = Buffer.alloc(size); }
    };
    return new Proxy({}, {
      get(target, property) {
        if (property === 'write') {
          return function(data) {
            ensureBuffer(); 
            const bytesWritten = buffer.write(data, offset); 
            offset += bytesWritten; 
            return bytesWritten;
          };
        }
        if (property === 'toString') {
            return () => {
                if (!buffer) { return ''; }
                return buffer.toString('utf-8', 0, offset);
            }
        }
        // 다른 모든 속성은 실제 버퍼에 위임
        ensureBuffer();
        const prop = buffer[property]; 
        return typeof prop === 'function' ? prop.bind(buffer) : prop;
      }
    });
}
```
`write()`가 처음 호출될 때만 `Buffer.alloc(size)`로 실제 메모리를 할당하는 **가상 프록시(virtual proxy)** — 값비싼 리소스(메모리 할당)를 필요할 때까지 미루는 지연 초기화 패턴이다. 이 연습문제의 3단계 개선 과정 자체가 훌륭한 학습 자료:
1. **`index.mjs`(최초 버전)**: `new Proxy(Buffer, {...})`로 `Buffer` "클래스"를 target으로 삼는 설계 실수 — `write`를 호출할 때마다 매번 새 버퍼를 만들어버려서 "누적 쓰기"가 안 되고, offset 개념도 없다.
2. **`index.mjs`(개선, target을 `{}`로 변경) 코드 안 주석**: `toString`을 함수가 아니라 **값을 즉시 반환**하도록 짜면 실패한다는 것을 직접 실험하고 기록해뒀다.
```js
   // exercise/lazyBuffer05/index.mjs:48-70 (주석 학습 노트)
   /*
       console.log(lazyBuffer.toString ) 이런 접근은 메서드로 호출하는게 아님. 속성으로 접근하는것. 
       프록시는 원래 객체 사용을 그대로 따라해야하기에. 속성접근은 부적합. 
       ... 리턴자체를 함수로 할 경우 lazyBuffer.toString 시 화살표 함수가 반환됨.
       그럼 lazyBuffer.toString() 시 실제 내부 로직이 호출됨!
   */
   ```
   즉 `get` 트랩에서 메서드를 흉내 낼 때는 **"함수를 반환"**해야지 "값을 즉시 계산해서 반환"하면 안 된다는, Proxy로 메서드를 프록시할 때 반드시 지켜야 할 규칙을 스스로 실험하며 깨달은 기록.
3. **`index2.mjs` 마지막 주석**: `buffer[property]`를 `bind(buffer)` 없이 그대로 반환하면 `lazyBuffer.slice(3)` 같은 호출에서 `this`가 프록시(`target`인 빈 객체 `{}`)를 가리키게 되어 내부적으로 실제 버퍼 메모리에 접근하려다 에러가 난다는 것을 지적한다 — 개념 1의 `.bind(calculator)`와 정확히 같은 문제(`this` 컨텍스트 유실)가 Proxy의 위임 코드에서도 똑같이 발생한다는 것을 보여주는 좋은 예.

---

## Proxy vs Decorator vs Adapter 비교표

| 기준 | Proxy | Decorator | Adapter |
|---|---|---|---|
| **핵심 목적** | 원본에 대한 **접근을 제어/가로채기** (검증, 로깅, 캐싱, 지연 생성, 반응형) | 원본에 **새로운 책임(기능)을 동적으로 추가** (OCP) | **호환되지 않는 두 인터페이스를 번역**해서 이어줌 |
| **인터페이스** | 원본과 **동일한** 인터페이스 유지 | 원본과 **동일한** 인터페이스 + 새 메서드 추가 | 원본(Adaptee)과 **다른**, 클라이언트(Target)가 기대하는 인터페이스로 변환 |
| **원본 구조 변경 여부** | 변경 안 함(Composition/ES6 Proxy) — Augmentation은 예외적으로 직접 변경(비권장) | 변경 안 함(Composition/ES6 Proxy) — Augmentation은 예외적으로 직접 변경(비권장) | 변경 안 함 — 새 wrapper 객체가 별도로 존재 |
| **여러 개 중첩(stacking) 가능 여부** | 가능하지만 흔치 않음 | **핵심 특징** — Decorator를 겹겹이 쌓아 기능을 누적(예: `LoggingDecorator(SecurityDecorator(calculator))`) | 보통 1회성 변환, 중첩 개념이 크게 의미 없음 |
| **대표 구현 기법(이 저장소 기준)** | ES6 `Proxy`의 `get`/`set` 트랩, Composition, Object Literal | Composition, Object Augmentation, ES6 `Proxy` | 팩토리 함수가 새 객체를 반환하며 메서드 시그니처·에러·옵션 포맷을 변환 |
| **사용 시점** | 접근 로그, 캐싱, 권한 검증, lazy init, 데이터 바인딩(옵저버) | 로깅/보안/캐싱 등 부가 기능을 조합 가능한 단위로 쌓아야 할 때, 원본을 수정할 수 없거나 수정하고 싶지 않을 때 | 레거시/서드파티 라이브러리를 새 클라이언트 코드 기대치에 맞춰야 할 때 (예: LevelDB → `fs` API 흉내) |

---

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가

- `Proxy`로 메서드를 가로챌 때 **반드시 함수를 반환**해야 하는지(`get` 트랩 안에서 값 즉시 계산 vs 함수 반환) 헷갈릴 때 → `exercise/lazyBuffer05/index.mjs`의 `toString` 실험 주석 참고.
- 위임(delegate) 코드에서 `this` 컨텍스트가 깨져 `Illegal invocation`류 에러가 날 때 → `01-proxy/01-calculator/02-proxy-literal-remove-redundancy.mjs`의 `.bind(calculator)`, `exercise/lazyBuffer05/index2.mjs`의 `slice(3)` `this` 문제 참고. (study.txt의 `console.log` bind 노트도 같은 원리.)
- "이 기능을 Proxy로 만들지 Decorator로 만들지" 헷갈릴 때 → 목적이 **접근 제어**면 Proxy, **기능 추가**면 Decorator (비교표 참고). 구현 코드는 거의 동일하게 짤 수 있다는 점도 기억.
- Object Augmentation(monkey patching)을 쓰고 싶어질 때 → `study.txt` 4번 결론 재확인: 테스트 모킹/수정 불가능한 라이브러리 패치 외에는 지양. `02-decorator/02-decorator-object-augmentation.mjs`의 `peekValue === 0` 버그처럼 조용한 실수를 유발하기 쉬움.
- 서드파티 라이브러리(예: DB, 스토리지) 인터페이스를 표준 Node API(`fs`, `stream` 등)처럼 쓰고 싶을 때 → `03-adapter/fs-adapter.mjs`의 옵션 정규화(문자열 vs 객체) + 에러 시맨틱 변환(`ENOENT` 흉내) 패턴을 템플릿으로 재사용.
- ES6 `Proxy`의 `get`/`set`/`deleteProperty` 트랩 반환값 규칙(성공 시 `true` 필수 등)을 다시 확인해야 할 때 → `01-proxy/02-proxy-object/trap-test.mjs`.
- Node 콜백/이벤트 기반 API에 캐싱을 넣을 때 동기/비동기 일관성(Zalgo 방지)을 지켜야 함을 상기할 때 → `exercise/01-http-cache/index.mjs`의 `process.nextTick` 사용.
