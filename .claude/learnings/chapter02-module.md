# Chapter 2 — 모듈 시스템 (CommonJS / ESM)

## 개요
이 챕터는 Node.js가 코드를 "파일 하나 = 독립된 스코프"로 캡슐화하는 방법과, 그 캡슐화 단위들을 서로 연결하는 두 가지 시스템(CommonJS와 ESM)의 동작 차이를 다룬다. 핵심 문제는 세 가지다 — (1) 전역 스코프 오염 없이 코드를 어떻게 나눌 것인가(모듈 패턴/revealing module), (2) 모듈이 캐싱·순환 참조·바인딩 공유를 어떻게 처리하는가(loading, logger2), (3) 정적 문법의 한계를 넘어 런타임에 무엇을 로드할지 결정해야 할 때 어떻게 하는가(dynamicImport, importingJson). 저장소 루트 `package.json`이 `"type": "module"`이라 챕터의 모든 `.js` 파일은 기본적으로 ESM으로 실행되며, `module1/revealing-module-pattern.js`만 순수 IIFE라 모듈 시스템과 무관하게 동작한다. 예제들은 "옛날 방식(IIFE 캡슐화) → ESM export 문법 → 로딩/캐싱/바인딩의 실제 동작 → 그걸 이용/오용해보는 실험(monkey patch, 재할당 시도) → 동적 로딩이 필요한 실전 시나리오(i18n, JSON)" 순서로 하나의 학습 곡선을 이룬다.

### 모듈 패턴의 원형 — revealing module pattern (module1)
```js
// chapters/chapter2_module/module1/revealing-module-pattern.js:1-16
const myModule =( () => {
    const privateFoo = () => {} 
    const privateBar = [] 

    console.log('INSIDE : ' ,privateFoo, privateBar)

    const exported = {
        publicFoo: () => {},
        publicBar: []
    }
    return exported
}
)()

console.log('Outside:', myModule.privateFoo, myModule.privateBar)
console.log('Module:', myModule)
```
- IIFE(즉시실행함수)로 스코프를 만들고, 그 안에서 정의한 `privateFoo`/`privateBar`는 클로저 밖으로 노출되지 않는다. 함수가 끝나며 반환한 `exported` 객체의 프로퍼티만 `myModule` 바깥에서 접근 가능 — 실행하면 `Outside:`에서 `privateFoo`, `privateBar`는 `undefined`로 찍힌다.
- 이것이 CommonJS의 모듈 래핑(`(function(exports, require, module, __filename, __dirname) {...})`)이 내부적으로 하는 일과 같다. Node의 모듈 시스템은 이 패턴을 언어 차원에서 자동화한 것뿐이다.
- 언제 다시 쓰는가: `import`/`export`를 쓸 수 없는 환경(브라우저 `<script>` 인라인, 번들 전 레거시 코드, 즉석 스니펫)에서 전역 오염 없이 네임스페이스를 만들어야 할 때. 실무에서 ESM/CJS가 있는 한 잘 안 쓰지만, "왜 모듈이 스코프를 격리해주는가"를 설명할 때 가장 좋은 최소 예제다.
- `module1/index.js`는 현재 빈 파일(placeholder) — 별도 참고 코드 없음.

### 다양한 export 형태 실험 — logger 모듈
```js
// chapters/chapter2_module/logger/logger.js:1-29
export default function log(message) {
    console.log(message)
  }
  export const DEFAULT_LEVEL = 'info'
  export const LEVELS = { error: 0, debug: 1, warn: 2, data: 3, info: 4, verbose: 5 }

  export class Logger{
    constructor(name){ this.name = name ; }
    log(message){ console.log(`[${this.name}] ${message}`) }
  }
  export function info(message) { log(`info: ${message}`) }
```
한 파일에 **default export**(함수), **named export**(상수, 객체, 클래스, 함수)가 모두 섞여 있다. 챕터 진입점 `index.js`의 주석 처리된 실험 코드가 이 모듈을 여러 import 문법으로 가져와 본다:
```js
// chapters/chapter2_module/index.js:9-30 (주석 처리된 실습 코드)
// import * as loggerModule from './logger/logger.js'   // namespace import
// import { Logger, log as log2 } from './logger/logger.js'  // named import + as 리네이밍
// import Mylogger from './logger/logger.js'             // default import
// import Mylog , {info} from './logger/logger.js'       // default + named 동시 import
```
- `export default`는 모듈당 하나만 가능하고 import 시 아무 이름이나 붙일 수 있다(`Mylog`, `Mylogger`처럼). named export는 export한 이름 그대로 가져오거나 `as`로 로컬 이름을 바꿔야 한다.
- `import * as loggerModule`은 default까지 포함한 모든 export를 하나의 네임스페이스 객체로 묶는다 — `loggerModule.default`, `loggerModule.Logger` 형태로 접근.
- 실무 트레이드오프: default export는 리팩터링 시 import 쪽 이름이 파일마다 달라져 검색/추적이 어렵다. named export만 쓰면 IDE 자동완성·일괄 리네이밍이 쉬워진다 — 최근 스타일 가이드(Airbnb 제외 다수)는 named export 위주를 권장하는 이유.

### 모듈 로딩 순서, 캐싱, live binding — loading/
```js
// chapters/chapter2_module/loading/counter.js:1-5
export let count = 0 ; 

export function increment(){
    count++ 
}
```
```js
// chapters/chapter2_module/index.js:62-70 (주석 처리된 실습 코드 + 사용자 메모)
// import { count , increment } from "./loading/counter.js";
// console.log(count); 
// increment() ;  //원본 변수가 변경되는 것이기에 counter도 바뀜. 
// console.log(count); 
// count++;   // original value 안바뀜.  read-only binding. 
// console.log(count)
//common js는 shallow copy. 
```
- ESM named export는 **live binding**(값이 아니라 "그 변수를 가리키는 읽기 전용 참조")이다. `increment()`가 원본 모듈 내부의 `count`를 바꾸면, import한 쪽에서 다시 읽을 때 바뀐 값이 그대로 보인다. 반면 import한 쪽에서 직접 `count++`를 하면 "읽기 전용 바인딩에 대입 시도"로 **TypeError**가 발생한다(ESM은 항상 strict mode).
- 반대로 CommonJS는 `const { count } = require('./counter')` 방식으로 **구조 분해 시점에 값을 복사**한다(주석의 "shallow copy"). 이후 원본 모듈에서 count를 바꿔도 이미 복사해둔 로컬 변수는 갱신되지 않는다 — 이게 ESM과 CJS의 근본적인 차이이자, "왜 CJS 카운터/상태 공유 모듈은 흔히 객체나 getter 함수를 export하는가"의 답이다(값 자체가 아니라 참조를 공유해야 하므로).

```js
// chapters/chapter2_module/loading/a.js:1-4
import * as bModule from './b.js'
export let loaded = false
export const b = bModule
loaded = true
```
```js
// chapters/chapter2_module/loading/b.js:1-4
import * as aModule from './a.js'
export let loaded = false
export const a = aModule
loaded = true
```
- 순환 참조(circular dependency) 실습. `a.js`를 먼저 로드하면 Node는 `a.js` 실행을 시작하다가 `import * as bModule from './b.js'`에서 `b.js` 로딩으로 진입하고, `b.js`는 다시 `a.js`를 import한다 — 이때 `a.js`는 아직 실행이 끝나지 않았으므로 Node는 **이미 등록된(하지만 미완성인) 모듈 레코드**를 그대로 반환한다. 결과적으로 `b.js` 안에서 본 `aModule.loaded`는 `false`(아직 `a.js`가 `loaded = true`를 실행하기 전)이고, `b.js`가 끝난 뒤 `a.js`로 복귀해 `loaded = true`가 실행된다.
- ESM은 이 상황에서도 live binding 덕분에 "나중에 값이 채워지면 자동으로 갱신된 값을 보게" 되지만, **로딩이 진행 중인 시점에 즉시 읽으면 여전히 undefined/초기값**을 보게 된다. 즉 순환 참조 자체가 없어지는 게 아니라, "지금 당장 값을 쓰려는" 코드가 초기값을 만날 뿐이다.
- 실무 교훈: 순환 의존은 가능하면 피하되, 피할 수 없다면 모듈 최상위에서 즉시 상대 모듈의 값을 사용하지 말고 함수 안에서 지연 평가(lazy access)하도록 설계해야 한다. `console.log('a ->', a)`를 모듈 최상위에서 바로 찍으면 예상과 다른(비어 있는) 결과를 흔히 보게 되는 게 이 패턴의 전형적인 함정이다.

### 기존 모듈 확장/오염 실험 — logger2/
```js
// chapters/chapter2_module/logger2/logger2.js:1-19
export const logger = {
    info(message) { console.log(`[INFO]\t${message}`) },
    error(message) { console.log(`[ERROR]\t${message}`) },
    warn(message) { console.log(`[WARN]\t${message}`) },
    debug(message) { console.log(`[DEBUG]\t${message}`) },
  }

export default { logger }
```
```js
// chapters/chapter2_module/logger2/colorizeLogger2.js:1-16
import { logger } from './logger2.js'
const RED = '\x1b[31m'
...
const originalInfo = logger.info
logger.info = message => originalInfo(`${GREEN}${message}${RESET}`)
logger.warn = message => originalWarn(`${YELLOW}${message}${RESET}`)
logger.error = message => originalError(`${RED}${message}${RESET}`)
logger.debug = message => originalDebug(`${WHITE}${message}${RESET}`)
```
- `logger`는 **객체**로 export됐다 — ESM에서 원시값 재바인딩(`count++`)은 막혀 있지만, import한 객체의 **프로퍼티를 변경하는 것은 허용**된다(바인딩 자체가 아니라 그 객체 내부 상태를 바꾸는 것이므로). `colorizeLogger2.js`는 이 허점을 이용해 원본 `logger.info/warn/error/debug` 함수를 색상 입힌 래퍼로 **몽키패치**한다.
- `index.js`의 실행 코드에서 이 파일을 import하는 방식이 흥미롭다:
```js
// chapters/chapter2_module/index.js:81-86
// import { logger } from './logger2/logger2.js'
// import './logger2/colorizeLogger2.js' // colorizeLogger가 export를 하지않기에 import를 생략한 형태로 작성 
// logger.info('Hello, World!')
```
  `colorizeLogger2.js`는 아무것도 export하지 않고 **부수효과(side effect)**만 있으므로 `import './colorizeLogger2.js'`처럼 바인딩 없이 import한다. ESM 모듈 그래프에서 같은 모듈(`logger2.js`)은 한 번만 평가되고 캐싱되므로, `logger2.js`가 export한 `logger` 객체는 `index.js`와 `colorizeLogger2.js`가 **동일한 참조**를 공유한다 — 그래서 다른 파일에서 몽키패치한 결과가 여기서도 보인다.
- 몽키패칭은 실무에서 대체로 **안티패턴**으로 취급된다(주석에도 "monkey patch...주로 anti pattern 이긴함"이라고 명시). 디버깅이 어렵고, import 순서에 동작이 좌우되며(먼저 patch를 import해야 효과가 있음), 라이브러리 업데이트 시 조용히 깨진다. 그래도 알아야 하는 이유: 로깅 컬러화, 테스트에서 콘솔/타이머 스텁, 레거시 코드 임시 패치 등에서 실제로 쓰인다.

```js
// chapters/chapter2_module/logger2/replaceLogger.js:1-13
import { logger } from './logger2.js'
...
// 의도된 실험: import된 바인딩은 재할당 불가 -> 실행 시 TypeError로 실패하는 것을 확인하기 위한 코드
logger = {
    info : message => { console.log('message , changed. ') }
}
```
```js
// chapters/chapter2_module/logger2/replaceLogger2.js:17-24
loggerModule.logger = {   // namespace import 멤버 재할당도 실패
    info : (message) => { console.log(`${GREEN}${message}${RESET}`) }
}
```
```js
// chapters/chapter2_module/logger2/replaceLogger3.js:17-22
loggerModule.logger = {   // default export로 가져온 객체의 프로퍼티 자체는 재할당 가능
    info : (message) => { console.log(`${GREEN}${message}${RESET}\n changed !! `) }
}
```
- 세 파일은 README에도 명시된 대로 **의도적으로 실패/성공을 갈라 보여주는 대조 실험**이다.
  - `replaceLogger.js`: named import한 바인딩 `logger` 자체를 재할당(`logger = {...}`) → **TypeError**(named binding은 완전히 읽기 전용).
  - `replaceLogger2.js`: `import * as loggerModule`으로 가져온 네임스페이스 객체의 멤버(`loggerModule.logger`)에 대입 → 이것도 **TypeError**(네임스페이스 객체 자체도 동결되어 각 export 프로퍼티가 읽기 전용).
  - `replaceLogger3.js`: `import loggerModule from './logger2.js'`로 **default export**(즉 `{ logger }`라는 평범한 객체 리터럴)를 가져와 `loggerModule.logger = {...}`로 재할당 → 이건 **성공**한다. default export로 내보낸 객체 자체는 "그 객체"일 뿐이고, 그 프로퍼티를 바꾸는 것은 named export 바인딩 보호 규칙과 무관한 일반 객체 변경이기 때문이다.
- 핵심 차이: ESM이 보호하는 것은 "모듈 export 바인딩(이름과 값의 연결)"이지 "값 자체의 불변성"이 아니다. named export든 namespace 객체든 **바인딩 슬롯**에 새 값을 넣는 시도는 막히지만, export된 값이 객체라면 그 **프로퍼티**를 바꾸는 것(mutate)은 자바스크립트의 일반 객체 변경 규칙을 따른다 — `logger2.js`의 `logger`(named export)와 `colorizeLogger2.js`의 몽키패치가 성공하는 이유도 바로 이것(프로퍼티 변경이지 바인딩 재할당이 아님).
- 실무에서 자주 하는 실수: "export한 이름에 재할당해서 모듈을 교체(mock)하려는" 시도. Jest 등에서 `jest.mock`이 필요한 이유가 바로 이 ESM 바인딩 불변성 때문이다 — 직접 import한 이름을 테스트 코드에서 바꿔치기할 수 없다.

### JSON을 모듈로 가져오는 4가지 방법 — importingJson/
```json
// chapters/chapter2_module/importingJson/data.json:1-6
{
    "address" : "near apartment" , 
    "phone" : "11112222" , 
    "isDataValid" : "true"
}
```
```js
// chapters/chapter2_module/importingJson/main.mjs:1-3
import data from "./data.json" with {type : 'json'} 
//type : json 명시함으로써 import 하는게 json이니 , 내부 코드를 실행 안시킴. 
console.log(data);
```
- **정적 import 어트리뷰트**(`import ... with { type: 'json' }`, 과거엔 `assert { type: 'json' }` 문법이었으나 현재 Node LTS는 `with`를 사용). JSON은 실행 가능한 코드가 아니므로 반드시 타입을 명시해야 로더가 "이건 파싱만 하고 스크립트로 실행하지 않는다"는 걸 안다 — 임의 확장자를 JS로 오인해 실행하는 보안 사고를 막는 장치이기도 하다.
```js
// chapters/chapter2_module/importingJson/main2.mjs:1-3
const { default: data } = await import('./data.json', {
    with: { type: 'json' },
  })
```
- **동적 import**로 같은 것을 한다. `import()`는 항상 Promise를 반환하고 namespace 객체를 resolve하므로, JSON의 경우 `default` 프로퍼티에 파싱된 값이 들어있다 — 구조 분해로 꺼낸다. 정적 import와 달리 조건부/런타임 경로에서 JSON을 고를 때 유용.
```js
// chapters/chapter2_module/importingJson/main3.mjs:1-13
import {readFile} from 'node:fs/promises'
import { join } from 'node:path' 

const jsonPath = join(import.meta.dirname , 'data.json'); 
try{
    const dataRaw = await readFile(jsonPath);
    const jsonData = JSON.parse(dataRaw); 
    console.log(jsonData);
}catch(err){
    console.log(err); 
}
```
- **수동 방식**: `fs/promises`로 파일을 읽고 직접 `JSON.parse`. `import.meta.dirname`(Node 20.11+/21.2+에서 안정화)로 현재 모듈 파일 기준 디렉터리를 구한다 — CJS의 `__dirname`에 대응하는 ESM 표준 방법. import 어트리뷰트 문법이 아직 실험적/버전 의존적이던 시절에 흔히 쓰이던 폴백 패턴이며, 지금도 "JSON이 아니라 다른 포맷(YAML 등)으로 확장될 여지가 있는 설정 파일"을 다룰 때 유리하다(에러 처리를 직접 제어 가능).
```js
// chapters/chapter2_module/importingJson/main4.mjs:1-5
import {createRequire} from 'node:module'; 

const require = createRequire(import.meta.url); 
const data = require('./data.json'); 
console.log(import.meta.url , require , data)
```
- **ESM 안에서 CommonJS `require`를 재생성**해 쓰는 방법. `createRequire(import.meta.url)`은 현재 ESM 모듈의 URL을 기준으로 동작하는 `require` 함수를 만들어준다. CJS의 `require('./data.json')`는 내부적으로 JSON을 동기적으로 읽고 파싱해서 캐싱까지 해준다 — ESM에서 동기적으로 JSON을 즉시 얻고 싶을 때(async/await를 쓸 수 없는 상황, 또는 CJS 생태계 라이브러리와 상호운용) 쓰는 브리지 패턴이다.
- 네 방법의 트레이드오프 요약: `with {type:'json'}`(정적)이 가장 선언적이고 번들러/타입체커 지원이 좋지만 Node 버전 요구사항이 있다 → 동적 `import()` 버전은 조건부 로딩에 적합 → `readFile`+`JSON.parse`는 버전 호환성이 가장 넓고 에러 핸들링이 명시적이지만 코드가 길다 → `createRequire`는 동기 접근이 필요하거나 CJS 상호운용이 필요할 때만 쓰는 우회로다.

### 런타임에 무엇을 로드할지 결정하기 — dynamicImport/ (i18n 예제)
```js
// chapters/chapter2_module/dynamicImport/strings-ko.js:1-10
export const HELLO = '안녕하세요 월드';

const population = () => {
    console.log('5000만'); 
}

export default population; 

export const add = () => {
    console.log('add function')
}
```
```js
// chapters/chapter2_module/index.js:34-52 (주석 처리된 실습 코드)
// const SUPPORTED_LANGUAGES = ['el' , 'en' , 'es' , 'fr' , 'ko'] ; 
// const selectedLanguage = process.argv[2]; 
// if(!selectedLanguage){ ... 사용법 안내 후 process.exit(1) ... }
// if(!SUPPORTED_LANGUAGES.includes(selectedLanguage)){ ... process.exit(1) }
// const strings = await import(`./dynamicImport/strings-${selectedLanguage}.js`);
// strings.default(); 
```
- 언어 코드마다 `strings-en.js`, `strings-ko.js`, `strings-el.js`, `strings-es.js`, `strings-fr.js`로 파일을 분리해두고, CLI 인자(`process.argv[2]`)로 어떤 언어를 로드할지 **런타임에** 결정한다. `import()`는 문자열 템플릿을 경로에 넣을 수 있어(정적 `import`는 경로가 리터럴이어야 해서 불가능) 이런 동적 선택이 가능하다.
- `strings-ko.js`만 default export(`population` 함수)와 named export(`add`)까지 갖고 있고 나머지 언어 파일은 `HELLO` 상수 하나뿐이다 — 실무에서 흔히 벌어지는 "번역 파일 간 스키마 불일치" 문제를 그대로 재현한다. 이런 구조라면 `strings.default()`를 다른 언어 파일에 호출하면 `undefined is not a function` 에러가 난다 — 동적 import 기반 다국어 로딩을 설계할 때는 모든 언어 파일이 **동일한 export 인터페이스**를 지키도록 강제(타입/스키마 검증, 빌드 타임 린트)해야 한다는 교훈.
- `import()`가 유용한 전형적 시나리오: 코드 스플리팅(무거운 모듈을 필요할 때만 로드), 조건부 플러그인 로딩, i18n처럼 선택지가 데이터에 의해 결정되는 경우, 순환 참조를 런타임에 지연시켜 회피하는 경우. 정적 `import`는 파일 최상단에서 문자열 리터럴 경로만 허용하는 반면 `import()`는 표현식을 받고 Promise를 반환한다는 게 근본적 차이.

## CommonJS vs ESM 비교
실습 코드에서 실제로 확인된 차이만 정리한다.

| 항목 | CommonJS | ESM (이 저장소 기본값, `"type":"module"`) |
|---|---|---|
| export된 값 접근 방식 | `require()` 시점에 값을 **복사**(구조분해 시 shallow copy) — `loading/counter.js` 실습에서 `count++`를 로컬에서 해도 원본 안 바뀜, 원본이 바뀌어도 로컬 복사본은 갱신 안 됨 | **live binding**(읽기 전용 참조) — 원본이 바뀌면 자동 반영(`increment()` 호출 후 재조회 시 갱신된 값), 로컬에서 재할당 시도 시 TypeError |
| named import 재할당 | 가능(단순 지역 변수이므로) | 불가능 — `logger2/replaceLogger.js`, `replaceLogger2.js`에서 TypeError로 실증 |
| default export로 받은 **객체**의 프로퍼티 변경 | 가능 | 가능 — `logger2/replaceLogger3.js`에서 성공 확인. 바인딩 보호와 객체 mutate는 별개 |
| 파일 확장자/문법 | `.cjs` 또는 `"type":"commonjs"` 하의 `.js`, `require`/`module.exports` | `.mjs` 또는 `"type":"module"` 하의 `.js`, `import`/`export` |
| 순환 참조 시 값 | 미완성 모듈의 `module.exports`(그 시점까지 채워진 것) 반환 | 미완성 모듈의 live binding 반환(초기값). `loading/a.js` ↔ `loading/b.js`에서 재현 |
| JSON 로드 | `require('./data.json')`이 동기적으로 즉시 지원 | 별도 문법 필요: `import ... with {type:'json'}`(정적) 또는 `import(...,{with:{type:'json'}})`(동적), 혹은 `createRequire`로 CJS require를 빌려옴 (`importingJson/main4.mjs`) |
| 동적 로딩 | `require()`를 함수처럼 호출해도 표현식 가능(느슨함) | `import()`(Promise 반환) — 정적 `import`는 리터럴 경로만 허용 |
| `__dirname` 대응 | 기본 제공 | `import.meta.dirname` (`importingJson/main3.mjs`) |
| 부수효과만 있는 모듈 import | `require('./x')`만 호출(반환값 버림) | `import './x.js'` (바인딩 생략) — `colorizeLogger2.js`를 이렇게 로드 |

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가
- 모듈에서 상태를 export하고 다른 모듈이 그 값을 실시간으로 참조해야 할 때 → ESM live binding vs CJS 값 복사 차이를 떠올리고, CJS 환경이면 값 대신 getter 함수나 객체를 export할 것 (`loading/counter.js` 참고).
- `import`한 이름을 테스트 코드에서 바꿔치기(mock)하려다 "Assignment to constant variable" 류 에러를 만났을 때 → ESM 바인딩은 애초에 재할당 불가라는 걸 기억(`logger2/replaceLogger.js`), `jest.mock`/의존성 주입 패턴으로 우회.
- 순환 의존(circular import) 관련 버그(모듈 최상위에서 다른 모듈 값이 `undefined`로 보임)를 디버깅할 때 → `loading/a.js`/`b.js` 실습을 재현해 로딩 순서를 그려볼 것. 최상위 즉시평가 대신 함수 내부 지연 접근으로 리팩터링.
- 순수 부수효과 목적의 모듈(로깅 설정, 전역 patch, polyfill)을 로드할 때 → `import './x.js'` 형태(바인딩 없는 import)와, 그 안에서 이미 export된 객체를 mutate하는 몽키패치 기법을 참고(단, 안티패턴이라는 점 인지하고 대안(DI, 명시적 wrapper) 우선 고려).
- 설정/데이터 JSON을 ESM 모듈에서 가져와야 할 때 → Node 버전과 동기/비동기 요구사항에 따라 `with {type:'json'}`(정적, 최신 Node), 동적 `import()`+`with`, `fs/promises`+`JSON.parse`(가장 호환적), `createRequire`(동기 필요 시) 중 선택.
- 런타임 조건(CLI 인자, 사용자 언어, 플러그인 이름 등)에 따라 로드할 모듈을 결정해야 할 때 → `dynamicImport/` 패턴(`import(`./path-${variable}.js`)`)을 쓰되, 선택 가능한 모든 모듈이 동일한 export 인터페이스를 갖도록 사전 검증/린트할 것.
