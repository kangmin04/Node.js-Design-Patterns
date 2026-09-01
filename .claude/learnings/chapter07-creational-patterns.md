# Chapter 7 — 생성 패턴 (Factory, Builder, Revealing Constructor, Singleton)

## 개요

이 챕터는 "객체를 어떻게 만들 것인가"라는 하나의 질문을 4개의 서로 다른 각도에서 다룬다. **Factory**는 `new` 호출부를 캡슐화해서 "어떤 클래스를 생성할지"를 소비자 코드로부터 숨기고 다형성·비공개 상태를 얻는다. **Builder**는 생성자에 넘겨야 할 인자가 많고 조합이 복잡할 때, 단계적으로 값을 채우고 마지막에 유효한 객체 하나를 만들어내는 유창한(fluent) API를 제공한다. **Revealing Constructor**는 "생성 시점에만 잠깐 열리는 특권 API"를 이용해서, 인스턴스가 만들어진 뒤에는 절대 외부에서 접근할 수 없는 기능(예: 불변 버퍼의 쓰기 메서드)을 만든다. **Singleton**은 Node.js의 모듈 캐싱(require/import 캐시)을 이용해 "이 프로세스 안에서 이 객체는 딱 하나만 존재한다"를 보장하는 가장 간단한 방법이지만, 테스트 용이성·결합도 측면의 함정을 갖고 있어 의존성 주입(DI)과 비교해서 이해해야 한다. 네 패턴 모두 "생성 로직의 캡슐화"라는 공통 목적을 갖지만, Factory는 *무엇을* 만들지, Builder는 *어떻게 단계적으로* 만들지, Revealing Constructor는 *생성 시점에만 무엇을 노출할지*, Singleton은 *몇 개를* 만들지를 각각 통제한다는 점이 핵심 차이다.

---

### 개념 1: Factory 패턴

#### 1-1. 가장 단순한 형태 — `new`를 함수 뒤로 숨기기

```js
// chapters/chapter7_patterns/01-factory/01-factory-simple.mjs:7-16
function createImage(name){
    return new Image(name)
}

class Image {
    constructor(path){
        this.path = path ; 
    }
}
```

`createImage()`라는 얇은 함수 하나가 `new Image()` 호출을 감싸고 있을 뿐이지만, 이 한 겹의 **간접화(indirection)**가 핵심이다. 소비자 코드는 `Image`라는 구체 클래스 이름을 몰라도 되고, 나중에 클래스 이름이 바뀌거나 생성 로직이 복잡해져도 `createImage` 내부만 고치면 된다. 파일 상단 주석에 있는 것처럼 **"new 키워드가 object type을 바인딩"**하는 문제 — 즉 소비 코드가 특정 클래스에 강하게 결합되는 문제를 팩토리가 끊어준다.

#### 1-2. 동적 클래스 선택 — 다형성을 팩토리 안으로

```js
// chapters/chapter7_patterns/01-factory/02-factory-dynamic-class.mjs:47-58
function createImage(name) {
    if (name.match(jpgRgx)) {
      return new ImageJpeg(name)
    }
    if (name.match(gifRgx)) {
      return new ImageGif(name)
    }
    if (name.match(pngRgx)) {
      return new ImagePng(name)
    }
    throw new Error('Unsupported format')
  }
```

`ImageGif`, `ImageJpeg`, `ImagePng`는 모두 `Image`를 상속하며 생성자에서 자체적으로 포맷 유효성 검사를 한다(예: `ImageGif`는 `gifRgx`에 안 맞으면 즉시 에러를 던짐 — 파일 14-21행). 팩토리는 확장자를 보고 **어떤 서브클래스를 인스턴스화할지 분기**하지만, 호출부(`createImage('photo.jpg')`)는 분기 로직을 전혀 모른다. 파일 코멘트가 지적하듯 팩토리 없이 `new Image()`만 쓰면 "포맷별로 다른 객체가 필요해지는 순간" 호출부 전체를 다시 고쳐야 하지만, 팩토리를 쓰면 **분기점이 팩토리 함수 하나로 집중**된다.

#### 1-3. 캡슐화 — 팩토리 + 클로저로 비공개 상태 만들기

```js
// chapters/chapter7_patterns/01-factory/03-factory-encapsulation.mjs:6-23
function createPerson(name) {
    const privateProperties = {}
  
    const person = {
      setName(name) {
        if (!name) {
          throw new Error('A person must have a name')
        }
        privateProperties.name = name
      },
      getName() {
        return privateProperties.name
      },
    }
  
    person.setName(name)
    return person
  }
```

이 예제가 Factory 패턴의 또 다른 가치를 보여준다. 클래스 기반이 아니라 **클로저(closure)** 를 이용해 `privateProperties`를 함수 스코프 안에 완전히 숨기고, 외부에는 `setName`/`getName`이라는 공개 인터페이스만 담긴 객체(`person`)를 반환한다. `me.privateProperties`로 직접 접근하면 `undefined`가 나오고(33행), `setName('')`처럼 유효성 검사를 우회하려 하면 에러가 던져진다(41-44행) — **데이터 변경이 반드시 공개 인터페이스를 거치도록 강제**하는 것이 클래스의 `private` 필드보다 더 오래된, 그러나 여전히 유효한 JS 캡슐화 기법이다. `closure-test.mjs`의 `createCounter()`(1-14행)도 동일한 원리로, `counter.count = 100`을 실행해도 `getCount()`는 여전히 1을 반환한다 — 외부 대입이 클로저 내부 변수에 아무 영향을 주지 못한다.

#### 1-4. 환경별로 다른 구현을 돌려주는 팩토리 — profiler 예제

```js
// chapters/chapter7_patterns/01-factory/04-profiler/profiler.mjs:18-30
const noopProfile = {
    start() {} , 
    end () {}
}

//IMPLEMENTATION  , OBJECT 분리 장점 
export function createProfiler(label){
    if(process.env.NODE_ENV === 'production'){
        return noopProfile ; 
    }

    return new Profiler(label); 
}
```

`Profiler` 클래스는 `process.hrtime()`으로 실제 시간을 측정하지만(1-16행), 프로덕션 환경에서는 `noopProfile`이라는 **아무 일도 안 하는 객체**를 대신 반환한다. `index.mjs`(1-21행)의 `getAllfactors` 함수 입장에서는 `profiler.start()` / `profiler.end()`를 호출하는 코드가 동일하며, 실제로 시간을 재는지 아닌지는 전혀 알 필요가 없다. 이것이 팩토리의 **"구현(implementation)과 인터페이스(object shape) 분리"** 이점이다 — 클래스 인스턴스든 리터럴 객체든, 호출부 입장에서 동일한 메서드 집합만 지키면 팩토리가 무엇을 리턴하는지는 자유롭다.

#### 1-5. `factory-study.mjs` — 적용 전/후 대조 (개념 설명용, 실행 대상 아님)

```js
// chapters/chapter7_patterns/01-factory/factory-study.mjs:22-30
function createLogger() {
  if (process.env.NODE_ENV === 'production') {
    return new FileLogger(); // 복잡한 설정은 여기서 처리
  }
  return new ConsoleLogger();
}
  // myService.js
const loggerA = createLogger(); // 팩토리가 알아서 적절한 로거를 줌
loggerA.log('Some message');
```

`FileLogger`/`ConsoleLogger`는 실제 구현이 없는 가상 클래스로, 순수하게 "팩토리 적용 전(`if (NODE_ENV === 'production') logger = new FileLogger()`가 서비스 코드에 그대로 노출)" vs "팩토리 적용 후(서비스 코드는 `createLogger()` 한 줄만 호출)"를 대조하기 위한 설명용 코드다. 여기서 얻어가야 할 교훈은, 03-factory-encapsulation과 04-profiler에서 본 것과 같은 패턴 — **복잡한 조건 분기를 팩토리 함수 하나로 모으고, 소비 코드(myService)는 그 분기를 전혀 몰라도 되게 만드는 것**이다.

---

### 개념 2: Builder 패턴

#### 2-1. 보트 조립 — 체이닝으로 복잡한 설정 객체 만들기

```js
// chapters/chapter7_patterns/02-builder/01-boat/boat.mjs:16-56
export class BoatBuilder {
    withMotors(count, brand, model) {
      this.hasMotor = true
      this.motorCount = count
      this.motorBrand = brand
      this.motorModel = model
      return this
    }
    withSails(count, material, color) { /* ... */ return this }
    hullColor(color) { this.hullColor = color; return this }
    withCabin() { this.hasCabin = true; return this }
    build() {
      return new Boat({ hasMotor: this.hasMotor, /* ... */ })
    }
  }
```

각 메서드가 `this`를 반환하기 때문에 `index.mjs`에서 `.withMotors(...).withSails(...).withCabin().hullColor('blue').build()`처럼 **체이닝(fluent interface)**이 가능하다(`chapters/chapter7_patterns/02-builder/01-boat/index.mjs:3-8`). `Boat` 생성자(1-14행)는 `Boolean(config.hasMotor)`, `config.motorCount || 0` 같은 기본값 처리를 담당해서, 빌더가 어떤 조합으로 값을 채워 넣어도 항상 안전한 `Boat` 인스턴스가 만들어진다. 이렇게 **10개 가까운 관련 옵션을 하나의 거대한 생성자 인자 리스트(telescoping constructor)로 두지 않고, 의미 단위(모터/돛/선체색/캐빈)로 나눠서 단계적으로 설정**할 수 있는 것이 Builder의 핵심 가치다.

#### 2-2. URL 빌더 — "일관성이 깨진 중간 상태" 문제와 그 해법

Builder가 왜 필요한지 가장 극명하게 보여주는 대조 예제다. 먼저 빌더 없이 위치 인자만 8개 받는 `Url` 클래스:

```js
// chapters/chapter7_patterns/02-builder/02-url-builder/url.mjs:2-19
export class Url{
    constructor(protocol, username, password, hostname,
        port, pathname, search, hash) {
            this.protocol = protocol
            // ...
            this.validate()
        }

        validate() {
            if (!(this.protocol && this.hostname)) {
              throw new Error('Must specify at least a protocol and a hostname')
            }
          }
```

`new Url('https', 'kim', '12', 'example.com', null, null, null, null)`(67행)처럼 호출해야 하는데, 인자가 8개나 되고 순서를 착각하기 쉬우며, 파일 44-63행 주석이 지적하듯 만약 `setProtocol`/`setHostname` 같은 세터를 `Url` 클래스 안에 직접 둔다면 **"객체는 생성됐지만 아직 모든 필드가 설정되지 않아 `validate()`를 통과하지 못하는" 일관성 깨진 중간 상태**가 생긴다.

이를 해결한 것이 별도 `createUrl` 빌더 클래스다:

```js
// chapters/chapter7_patterns/02-builder/02-url-builder/builderUrl.mjs:94-107
    build(){
        return new Url({
            protocol : this._protocol , 
            username : this._username , 
            password : this._password , 
            hostname : this._hostname , 
        })
    }
```

`setProtocol`, `setHostname`, `setAccount`, `setPort` 등(56-91행)은 모두 빌더(`createUrl`) 자신의 `_protocol` 등 비공개 필드에만 값을 쌓고 `this`를 반환한다. **`Url` 인스턴스는 오직 `build()` 호출 시점에 딱 한 번, 완성된 값들로만 생성**되므로(112-118행: `new createUrl().setProtocol('https').setAccount(...).setHostname(...).build()`), "생성될 때부터 항상 유효한 상태"라는 주석 그대로 중간 상태 문제가 원천적으로 사라진다. 즉 Builder는 **가변(mutable) 중간 객체(빌더)와 불변에 가까운 최종 객체(`Url`)를 분리**하는 패턴이다.

#### 2-3. 서드파티 라이브러리의 Builder — commander(CLI)와 superagent(thenable)

**commander**는 `.name().description().version().command().option().action()`을 체이닝하다가 마지막에 `.parse()`로 끝낸다:

```js
// chapters/chapter7_patterns/02-builder/03-third-party/cli.mjs:3-19
const program = new Command() //빌더 객체 생성
program
  .name('string-util')
  .description('CLI to some JavaScript string utilities')
  .version('0.8.0')
  .command('split')
  // ...
  .action((str, options) => { /* ... */ })
  .parse() 
```

여기서 배울 점은 **`build()`와 `parse()`의 차이**다. `build()`는 "설정을 취합해서 최종 객체를 반환"하는 것이 목적이지만(URL 예제), `parse()`는 반환값 자체보다 `process.argv`를 읽어 해당 커맨드의 `action` 콜백을 실행시키는 **부수효과(side effect)**가 목적이다. 즉 Builder 패턴이라고 해서 항상 "값 조립 → 리턴"으로 끝나는 것은 아니고, 라이브러리에 따라 마지막 메서드가 "실행"의 트리거가 되기도 한다.

**superagent**는 한 걸음 더 나아가 `.post().send().set()`까지는 설정만 쌓다가, `.then()`이 호출되는 순간 실제 HTTP 요청이 실행된다:

```js
// chapters/chapter7_patterns/02-builder/03-third-party/superagent-ex.mjs:34-56
  class SuperAgentRequestBuilder {
    constructor(method, url) {
      this.request = { method, url, headers: {}, data: null };
    }
    send(data) { this.request.data = data; return this; }
    set(key, value) { this.request.headers[key] = value; return this; }
  }
```

그리고 이를 가능케 하는 매커니즘이 **thenable 객체**다:

```js
// chapters/chapter7_patterns/02-builder/03-third-party/superagent-ex.mjs:76-98
  class MyRequestBuilder {
    // ...
    then(onFulfilled, onRejected) {
      console.log('3. .then()이 호출되어 실제 요청을 시작합니다!');
      const body = JSON.stringify(this._data);
      setTimeout(() => {
        try {
          const response = { success: true, receivedData: this._data };
          onFulfilled(response); 
        } catch (error) {
          onRejected(error);
        }
      }, 1000);
    }
  }
```

파일 주석이 정확히 짚어주듯, superagent 객체는 **Promise가 아니라 `.then()` 메서드만 가진 thenable**이다 — JS의 `await`/`async` 스펙은 "then 메서드를 가진 객체"를 Promise처럼 취급하므로(118-124행 주석) `await superagent.post(...).send(...).set(...)` 한 줄로 빌더 체이닝과 실행을 동시에 표현할 수 있다. 만약 진짜 Promise를 반환하는 즉시-실행 방식이었다면 `.send()`, `.set()` 같은 후속 체이닝 메서드를 붙일 수 없었을 것이다 — **Builder(지연 설정) + thenable(지연 실행)의 조합**이 이 API의 핵심 트릭이다.

---

### 개념 3: Revealing Constructor 패턴

#### 3-1. 쉬운 버전으로 먼저 이해하기 — "금고와 설치 기사" 비유

```js
// chapters/chapter7_patterns/03-revealing-constructor/01-easier-version.mjs:4-27
class SafeNumber {
  constructor(executor) {
    let secretNumber = 100;
    const add = (num) => { secretNumber += num; /* ... */ };
    const subtract = (num) => { secretNumber -= num; }; // 절대 노출 안 됨

    executor({
      add: add
      // subtract 기능은 리모컨에 포함시키지 않았습니다!
    });
  }
}

const mySafe = new SafeNumber((revealedApi) => {
  safeApi = revealedApi;
});
```

핵심은 `executor`라는 콜백이 **생성자 실행 도중, 딱 한 번만** 호출된다는 것이다. 이 순간에만 `add`처럼 노출하고 싶은 함수들을 담은 객체(`{ add }`)를 executor에게 "리모컨"으로 건네준다. `subtract`는 애초에 그 리모컨 객체에 담기지 않았으므로, 생성이 끝난 뒤에는 어떤 방법으로도 `subtract`를 호출할 수 없다(44-46행 주석 — `mySafe.secretNumber`도 `undefined`). **일반적인 클래스의 `private` 필드와 다른 점은, "생성 시점에만 유효한 특권"이라는 시간 제한이 있다는 것**이다 — 클로저 기반 캡슐화(개념 1-3의 `createPerson`)와 비슷해 보이지만, 노출 여부를 executor 콜백을 통해 "생성 순간에" 선택적으로 결정한다는 점이 다르다.

#### 3-2. 실전 예제 — `ImmutableBuffer`

```js
// chapters/chapter7_patterns/03-revealing-constructor/immutableBuffer.mjs:1-23
const MODIFIER_NAMES = ['swap', 'write', 'fill']
export class ImmutableBuffer {
  constructor(size, executor) {
    const buffer = Buffer.alloc(size) // 1
    const modifiers = {} // 2
    for (const prop in buffer) {
      if (typeof buffer[prop] !== 'function') continue
      if (MODIFIER_NAMES.some(m => prop.startsWith(m))) {
        modifiers[prop] = buffer[prop].bind(buffer) // 쓰기 계열 메서드 -> modifiers에만
      } else {
        this[prop] = buffer[prop].bind(buffer) // 읽기 계열 메서드 -> 인스턴스 자신에 노출
      }
    }
    executor(modifiers) // 6
  }
}
```

내부에서 실제 Node `Buffer`를 만든 뒤, 메서드 이름을 순회하며 `swap`/`write`/`fill`로 시작하는 **변경(mutate) 계열 메서드는 `modifiers` 객체에만 담아 executor에게 넘기고**, 그 외 읽기 계열 메서드(`readInt8` 등)는 `this`(즉 `ImmutableBuffer` 인스턴스 자신)에 바로 바인딩한다. 사용 예시:

```js
// chapters/chapter7_patterns/03-revealing-constructor/index.mjs:1-13
const immutable = new ImmutableBuffer(hello.length,
  ({ write }) => { write(hello) }
)
console.log(String.fromCharCode(immutable.readInt8(0)))
// immutable.write('Hello?') // TypeError: immutable.write is not a function
```

`write`는 생성자가 실행되는 그 순간 executor 콜백의 인자로만 전달되고 `immutable` 인스턴스 자체에는 절대 할당되지 않으므로, 생성 이후에는 `immutable.write`가 아예 `undefined`다. **"생성 시 초기 데이터를 채워 넣을 수는 있지만, 이후에는 절대 변경할 수 없는 객체"**라는, 클래스 필드의 `readonly`나 `Object.freeze`로는 표현하기 까다로운 요구사항을 자연스럽게 만족시킨다. `bind(buffer)`를 쓰는 이유도 중요한데 — 나중에 `write` 함수가 원래 컨텍스트를 벗어나 다른 곳(executor 콜백)에서 호출되더라도 내부의 `this`가 항상 원본 `buffer`를 가리키도록 보장하기 위해서다.

#### 3-3. exercise — `tamper-free-queue03`: revealing constructor로 생산자/소비자 분리

```js
// chapters/chapter7_patterns/exercise/tamper-free-queue03/index.mjs:23-51
class Queue {
    constructor(executor){
        this.queue = ['미리 넣어둔 데이터' , 'chunkeddata' , 'test']; 
        this.pendingResolvers = []; 

        const enqueue = (item) => {
            if(this.pendingResolvers.length > 0){
                const resolve = this.pendingResolvers.shift(); 
                resolve(item);
            }else{
                this.queue.push(item); 
            }
        }
        executor(enqueue)
    }
    dequeue(){
        return new Promise((resolve , reject) => {
            if(this.queue.length === 0){
                this.pendingResolvers.push(resolve); 
            }else{
                resolve(this.queue.shift())
            }
        })
    }
}
```

과제 요구사항(파일 1-19행 주석)은 "외부에 공개되는 메서드는 오직 `dequeue()`뿐이고, `enqueue()`는 생성자의 executor에만 전달돼야 한다"였다. 구현은 `ImmutableBuffer`와 동일한 패턴을 따른다 — `enqueue`는 클로저로 `this.queue`/`this.pendingResolvers`를 조작하는 지역 함수로 정의되고, `executor(enqueue)`를 통해서만 생성 시점에 노출된다. 흥미로운 점은 **큐가 비어 있을 때 `dequeue()`가 즉시 `resolve`하지 않고, `resolve` 함수 자체를 `pendingResolvers` 배열에 저장**해뒀다가(43-49행), 나중에 `enqueue`가 호출되면 그 `resolve`를 꺼내 실행해서(29-32행) "기다리던 Promise를 언블록"한다는 것이다 — Promise의 `resolve` 콜백을 데이터처럼 큐에 저장해두는 기법은 생산자-소비자(producer-consumer) 패턴을 Promise 기반으로 구현할 때 자주 쓰인다. `executor` 내부에서는 HTTP 서버(54-79행)를 띄워 `POST /message`로 들어온 body를 `enqueue`하고, `consume()` 함수(82-89행)는 `while(true)` 루프에서 `await queueInstance.dequeue()`로 계속 소비한다 — **HTTP 요청 핸들러(생산자)와 큐 소비 루프(소비자)가 서로의 존재를 몰라도 `enqueue`/`dequeue`라는 좁은 인터페이스로만 연결**되는 구조다.

---

### 개념 4: Singleton 패턴 (Node.js 모듈 캐싱 활용)

#### 4-1. 왜 Node.js에서 Singleton이 "거저" 생기는가

```js
// chapters/chapter7_patterns/04-singleton/dbBasic.mjs:1-15
class Database {
    constructor(name) {
      this.name = name;
      this.createdAt = new Date();
    }
    getName() { return this.name; }
  }
  
  // 클래스를 직접 내보내지 않고, 오직 인스턴스만 생성하여 내보냅니다.
  const dbInstance = new Database('main-db');
  export { dbInstance };
```

Node.js의 ESM/CJS 모듈 시스템은 **동일 경로의 모듈을 최초 1회만 평가하고, 이후 모든 `import`/`require`는 캐시된 동일 객체(module namespace)를 반환**한다. 따라서 `new Database(...)`를 모듈 최상단에서 한 번 실행하고 그 인스턴스만 export하면, 프로세스 안에서 이 모듈을 아무리 여러 곳에서 import해도 **항상 같은 인스턴스**를 받는다 — 별도의 `getInstance()`나 정적 플래그 없이도 싱글턴이 완성된다. `01-singleton-dependency/db.mjs`도 동일한 방식으로 `sqlite` 커넥션 자체를 모듈 스코프에서 열고 export한다(`export const db = await open({...})`).

#### 4-2. 싱글턴의 함정 1 — 강한 결합(직접 import)

```js
// chapters/chapter7_patterns/04-singleton/01-singleton-dependency/blog.mjs:1-12
import { db } from "./db.mjs";
export class Blog {
    initialize(){
        const initQuery = `CREATE TABLE IF NOT EXISTS posts(...);` 
        return db.run(initQuery)
    }
    // ...
}
```

`Blog` 클래스가 `db` 싱글턴을 파일 최상단에서 직접 `import`한다. 동작은 하지만 **`Blog`는 항상 `db.mjs`가 만든 그 특정 SQLite 커넥션에 결합**된다. 테스트에서 mock DB로 바꾸거나, 서로 다른 DB 설정으로 `Blog`를 여러 개 띄우는 것이 구조적으로 불가능하다 — 이것이 "Singleton은 편리하지만 테스트하기 어렵게 만든다"는 일반적인 비판의 실체다.

#### 4-3. 함정 해결 — 의존성 주입(DI)으로 바꾸기

```js
// chapters/chapter7_patterns/04-singleton/02-dependency-injection/blog.mjs:1-4
export class Blog {
    constructor(db) {
      this.db = db
    }
    // ...
}
```

```js
// chapters/chapter7_patterns/04-singleton/02-dependency-injection/db.mjs:1-8
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
export function createDb(filename) {
  return open({ filename, driver: sqlite3.Database })
}
```

`db.mjs`는 이제 인스턴스를 직접 export하지 않고, **DB 커넥션을 만드는 팩토리 함수(`createDb`)만 export**한다(개념 1의 Factory 패턴과 자연스럽게 연결됨). `index.mjs`(`02-dependency-injection`)에서 조립 책임이 호출부로 옮겨진다:

```js
// chapters/chapter7_patterns/04-singleton/02-dependency-injection/index.mjs:5-7
const db = await createDb(join(import.meta.dirname, 'data.sqlite'))
const blog = new Blog(db) //DI
```

`db.mjs`에는 테스트용 `createMockDb()`와 `NODE_ENV`에 따라 mock/real을 분기하는 `databaseFactory()`도 정의돼 있어(19-35행), **"싱글턴처럼 여전히 앱 전체에서 같은 DB 인스턴스를 재사용하되, 그 인스턴스를 누가 만들고 누구에게 주입할지는 최상위 조립 코드가 결정"**하는 구조로 바뀐다. 결과적으로 `Blog`는 어떤 DB 구현이든(real/mock) 주입받을 수 있는 **테스트 가능한 클래스**가 된다.

#### 4-4. 싱글턴의 함정 2 — `constructor` 프로퍼티로 우회 가능

```js
// chapters/chapter7_patterns/04-singleton/JSconstructor.mjs:6-19
class Person {
    constructor(name) { this.name = name; }
}
const me = new Person('kim');
console.log(me.constructor === Person); // true
const anotherMe2 = new me.constructor('park'); // me.constructor가 Person이므로 동일 동작
```

JS의 모든 인스턴스는 프로토타입 체인을 통해 **자신을 만든 생성자에 대한 참조(`instance.constructor`)**를 갖고 있다. 이 사실을 이용하면 클래스를 직접 export하지 않고 인스턴스만 export해도(개념 4-1의 `dbBasic.mjs`) 싱글턴 보장을 깰 수 있다:

```js
// chapters/chapter7_patterns/04-singleton/breakSingleton.mjs:8-21
import { dbInstance as singletonInstance } from './dbBasic.mjs';
// dbInstance.constructor를 통해 숨겨진 원본 생성자에 접근하여 새 인스턴스를 만듭니다.
const anotherInstance = new singletonInstance.constructor('another-db');
const areTheySame = singletonInstance === anotherInstance;
console.log(`두 인스턴스는 같은가? ${areTheySame ? 'YES' : 'NO'}`); // "NO"
```

즉 **Node.js의 모듈 캐싱 기반 싱글턴은 "관례(convention)에 의한 강제"일 뿐, 언어 차원의 강제가 아니다.** `singletonInstance.constructor`가 여전히 원본 클래스를 가리키기 때문에 `new`를 다시 호출하면 별개의 인스턴스가 생긴다. 완전히 막으려면 클래스 자체를 모듈 밖으로 절대 노출하지 않거나(클로저로 감싸기), 생성자 안에서 이미 인스턴스가 존재하면 에러를 던지는 방어 코드가 필요하다 — 다만 이 저장소 예제들은 그 정도까지 방어하지는 않고, "관례가 깨질 수 있다"는 사실 자체를 보여주는 데 집중한다.

`04-singleton/database.mjs`(클래스만 export, 인스턴스는 export 안 함)와 `dbInstance.mjs`(`export const dbInstance = new Database(...)`로 인스턴스만 export)는 각각 "클래스를 공개하는 방식"과 "인스턴스만 공개하는 방식"의 차이를 보여주는 짝 예제로, 후자가 바로 싱글턴 관례이고 전자는 누구나 자유롭게 여러 인스턴스를 만들 수 있는 일반 클래스임을 대조해준다.

---

### exercise 폴더 — 4개 패턴의 응용

| exercise | 적용 패턴 | 핵심 포인트 |
|---|---|---|
| `console-color-factory01/` | Factory | `createColor(inputColor)`가 색상 문자열만 보고 `RedConsole`/`BlueConsole`/`GreenConsole` 중 하나를 선택해 반환(`colorConsole.mjs:1-32`, `index.mjs:8-18`). `input`(로그 메시지)은 생성자가 아니라 `log(input)` 호출 시점에 전달하도록 설계 — 파일 주석(`index.mjs:3-7`)에서 "팩토리는 어떤 종류의 객체를 만들지만 결정하고, 실제 동작에 필요한 인자는 팩토리가 아니라 만들어진 객체의 메서드에 넘겨야 한다"는 설계 원칙을 스스로 정리해둔 점이 눈에 띈다. |
| `request-builder02/` | Builder | `basic-http.mjs`는 Node의 저수준 `https.request(options, cb)` API를 그대로 사용해 옵션 객체를 한 번에 만들어 넘기는 방식(1-38행)이고, `requestBuilder.mjs`의 `RequestBuilder`는 이를 `.setMethod().setUrl().setTimeLimit().setQuery().setBody().invoke()`로 체이닝 가능하게 감쌌다(`requestBuilder.mjs:5-72`). `setBody()`가 내부적으로 `Content-Length`/`Content-Type` 헤더를 자동으로 설정해주는 부분(39-45행)처럼, **저수준 API의 반복적인 보일러플레이트를 빌더 메서드 안에 캡슐화**하는 것이 이 exercise의 핵심 학습 포인트다. `invoke()`가 Promise를 반환하므로 `await builder.setMethod('Get').setUrl(...).invoke()`처럼 사용한다(74-79행). |
| `tamper-free-queue03/` | Revealing Constructor | 개념 3-3에서 다룸. `dequeue()`만 공개 메서드이고 `enqueue()`는 생성자 executor에만 전달됨. |

---

## 4가지 생성 패턴 비교표

| 패턴 | 해결하는 문제 | 대표 메서드/장치 | 이 챕터의 예제 | 트레이드오프 |
|---|---|---|---|---|
| **Factory** | 소비 코드가 구체 클래스에 강결합되는 것을 막고, 생성 시점의 분기·비공개 상태를 캡슐화 | 팩토리 함수가 `new`를 대신 호출, 클로저로 private 상태 구성 | `createImage`, `createProfiler`, `createColor`, `createPerson` | 팩토리 함수 자체가 많은 책임(분기)을 떠안을 수 있음. 클래스가 아니라 클로저 객체를 쓰면 `instanceof` 체크나 프로토타입 메서드 공유가 안 됨 |
| **Builder** | 생성자 인자가 많거나(telescoping constructor), 단계별로 값을 채워야 할 때, 완성 전까지 "일관성 깨진 중간 상태"가 노출되는 것을 막음 | 각 세터가 `this` 반환(체이닝), 마지막 `build()`(또는 `parse()`/`.then()`)에서 최종 객체 생성 | `BoatBuilder`, `createUrl`, commander, superagent, `RequestBuilder` | 빌더 클래스 자체가 보일러플레이트(세터 여러 개)를 요구. 체이닝 중간에 잘못된 조합을 넣어도 `build()` 전까지는 검증되지 않을 수 있음 |
| **Revealing Constructor** | 생성 시점에만 필요한 특권적 기능(쓰기/설정)을 노출하고, 생성 이후에는 절대 그 기능에 접근하지 못하게 함 | 생성자가 `executor(privilegedApi)` 콜백을 단 한 번 호출 | `ImmutableBuffer`, `SafeNumber`, `tamper-free-queue03`의 `Queue` | 일반적인 캡슐화보다 코드 흐름이 한 단계 더 간접적이라(콜백 안에서 변수를 캡처) 읽기 난이도가 올라감. Node 코어의 `Buffer`, `Promise` 생성자가 실제로 이 패턴을 씀 |
| **Singleton (모듈 캐싱)** | 앱 전체에서 동일한 인스턴스(DB 커넥션 등)를 공유해야 할 때, 매번 새로 만드는 비용/불일치를 방지 | 모듈 최상단에서 인스턴스를 만들고 그 인스턴스만 export | `dbBasic.mjs`의 `dbInstance`, `01-singleton-dependency/db.mjs`의 `db` | `instance.constructor`로 관례가 깨질 수 있음(강제력 없음). 직접 import하면 결합도가 올라가 테스트가 어려워짐 → DI로 대체 권장 |

---

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가

- 새 클래스를 만들 때 **생성자 인자가 4~5개를 넘어가거나, 옵션 중 일부만 선택적으로 채워야 하는 상황**이 생기면 → Builder(2-1, 2-2)를 먼저 검토한다.
- `if (env === 'production') { ... } else { ... }`처럼 **환경/조건에 따라 다른 클래스·객체를 만드는 코드가 서비스 로직 여기저기 흩어져 있다면** → Factory로 그 분기를 한 곳에 모을 수 있는지 확인한다(1-2, 1-4, 4-3).
- **"생성할 때만 필요한 민감한 기능(초기화용 쓰기 메서드, 설정 콜백 등)을 나중에 아무도 못 건드리게 하고 싶다"**는 요구사항이 나오면 → Revealing Constructor(3-1, 3-2)를 떠올린다. Node 코어의 `Promise`, `Buffer`가 실제로 이 방식을 쓴다.
- **DB 커넥션, 설정 객체, 로거처럼 앱 전체에서 하나만 존재해야 하는 리소스**를 만들 때 → 우선 모듈 스코프 싱글턴(4-1)으로 시작하되, 테스트 코드를 작성해야 하거나 여러 설정으로 동시에 띄워야 할 필요가 보이면 즉시 DI(4-3)로 전환한다 — `db.mjs`에서 인스턴스 export 대신 `createDb(filename)` 팩토리 함수를 export하는 형태로.
- 코드 리뷰에서 "이 싱글턴, 진짜 하나만 만들어지는 게 보장돼?"라는 질문이 나오면 → `breakSingleton.mjs`/`JSconstructor.mjs`(4-4)를 다시 봐서 `instance.constructor` 우회 가능성을 상기한다. 모듈 캐싱은 강제가 아니라 관례임을 기억할 것.
- superagent처럼 **체이닝 API인데 `await`만으로 실행되는 라이브러리**를 만나면 → thenable 개념(2-3)을 다시 확인해서, `.then()`이 Promise가 아니라 "지연 실행 트리거"로 쓰이고 있는지 점검한다.
