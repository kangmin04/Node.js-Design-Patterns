# Chapter 3 — 콜백 패턴

## 개요
이 챕터는 "콜백 하나를 넘긴다"는 단순한 API 뒤에 숨어 있는 **타이밍 규약**의 문제를 파헤친다. `incosistent/`는 같은 함수가 상황에 따라 동기·비동기로 갈리면(=Zalgo) 호출자가 아무리 조심해도 버그를 피할 수 없음을 보여주고, `error/`는 동기 예외·async/await·에러 우선 콜백 세 가지 스타일이 "에러를 위로 전달한다"는 동일한 목표를 완전히 다른 메커니즘으로 구현한다는 것을 같은 3단계(L1→L2→L3) 시나리오로 비교한다. `observer/`는 `EventEmitter`를 이용해 "하나의 비동기 작업에서 여러 개의 이벤트(진행률·완료·에러)를 내보내는" 표준 패턴과, 그 이면의 함정(리스너 등록 타이밍, 메모리 누수, `this` 바인딩)을 다룬다. `priority/`는 `process.nextTick`·`setTimeout`·`setImmediate`가 이벤트 루프의 어느 단계에서 실행되는지를 통해, 앞의 Zalgo 문제를 "항상 비동기로 만든다"는 해법이 실제로 어떻게 구현되는지를 보여준다. 결국 이 챕터의 모든 예제는 "콜백이 언제, 몇 번, 어떤 순서로 불리는가"라는 하나의 질문으로 수렴한다.

### Zalgo 문제 — 동기/비동기 콜백 일관성 (`incosistent/`)

```js
// chapters/chapter3_callback/incosistent/zalgo.mjs:9-20
function incosistentRead(filename , cb){
    if(cache.has(filename)){
        console.log('Cache hit! Executing synchronously.');
        cb(cache.get(filename)); //in synchronosly
    }else{
        console.log('Cache miss! Reading file asynchronously.');
        readFile(filename , 'utf-8' , (_err , data) => {  // in asynchrously
            cache.set(filename , data);
            cb(data); 
        })
    }
}
```

`incosistentRead`는 캐시 적중 시 **동기적으로**, 캐시 미스 시 **비동기적으로** `cb`를 호출한다. 문제는 이 분기가 함수 내부 상태(`cache`)에 의존한다는 점 — 호출자는 자신이 어느 경로를 타는지 미리 알 수 없다. `createFileReader`는 `incosistentRead`를 호출하자마자 `onDataReady`로 리스너를 등록받는 객체를 반환하는데, 리스너 등록은 **비동기 경로를 전제로** 한다("파일 읽기가 끝난 뒤에 등록된 리스너가 실행될 것"). 하지만 두 번째 호출(`reader2`)이 `setTimeout(..., 100)`으로 지연되어 실행되면, 그 시점엔 `reader1`의 `readFile`이 이미 끝나 `cache`가 채워져 있으므로 `reader2`는 동기 경로를 타게 된다. 즉 `cb`가 `createFileReader` 함수 실행 도중, **`listeners` 배열에 아직 아무것도 push되지 않은 시점**에 즉시 호출되어버려 리스너가 영원히 실행되지 않는다 — 콜백 유실.

```js
// chapters/chapter3_callback/incosistent/zalgoasync.mjs:4-17
function incosistentRead(filename , cb){
    if(cache.has(filename)){
        console.log('Cache hit! Executing synchronously.');
        process.nextTick(() => {
            cb(cache.get(filename));
        })
    }else{
        ...
```

`zalgoasync.mjs`의 해법(=Node.js 공식 가이드가 말하는 "Release Zalgo")은 동기 분기의 콜백 호출을 `process.nextTick()`으로 감싸 **강제로 비동기화**하는 것이다. 이렇게 하면 캐시 적중/미스와 무관하게 항상 "현재 동기 코드가 다 끝난 뒤" 콜백이 실행되므로, 호출자가 `onDataReady`를 등록할 시간을 항상 확보한다.

```js
// chapters/chapter3_callback/incosistent/zalgosync.mjs:1-11
import {readFileSync} from 'node:fs'
const cache = new Map();
function cosistentRead(filename ){
    if(cache.has(filename)){
        return cache.get(filename); //direct style. returns data directly instead of callback
    }else{
        const data = readFileSync(filename , 'utf-8');
        cache.set(filename , data);
        return data; 
    }
}
```

`zalgosync.mjs`는 반대 방향의 해법 — 콜백 자체를 버리고 **항상 동기(direct style)** 로 통일한다. `readFileSync`를 써서 캐시 적중/미스 여부와 관계없이 값을 즉시 `return`한다. 코드 주석에 명시된 원칙: "purely synchronous style -> use direct style". 두 해법 모두 핵심은 같다 — **"함수의 실행 시점이 내부 조건에 따라 달라지게 두지 마라. 동기든 비동기든 하나로 고정하라."**

- **언제 다시 쓰는가**: 캐싱 레이어, 메모이제이션, 재시도 로직처럼 "이미 가진 값이면 즉시 반환, 없으면 I/O" 구조를 만들 때마다 이 패턴을 점검해야 한다. Promise 기반 코드에서도 `Promise.resolve(cachedValue)`로 감싸면 `.then()`이 항상 마이크로태스크로 지연되므로 자동으로 이 문제가 해결된다는 점도 기억할 것 (async/await 자체가 zalgoasync.mjs와 동일한 효과).
- **트레이드오프**: `process.nextTick` 강제 지연은 아주 미세한 성능 비용이 있지만 무시할 수준. 반대로 완전 동기화(`readFileSync`)는 이벤트 루프를 블로킹하므로 서버 요청 경로에는 부적합 — 스크립트/CLI 초기화 코드에서만 권장.
- **흔한 실수**: "지금 테스트해보니 항상 비동기로 도네?"라고 안심하는 것 — 이 버그는 타이밍(경쟁 상태)에 의존하므로 재현이 간헐적이다. 실제로 `zalgo.mjs` 주석에도 "setTimeout 없이 사용하면 정상적으로 출력됨"이라고 적혀 있어, 얼마나 쉽게 은폐되는 버그인지 보여준다.

### 에러 전파 3단계 비교 — 동기 / async-await / 콜백 (`error/`)

세 파일 모두 동일한 L1(메인)→L2(파일 처리)→L3(파싱) 3단 구조로 "하위에서 발생한 에러가 상위까지 컨텍스트를 덧붙이며 전파"되는 시나리오를 재구현한다.

```js
// chapters/chapter3_callback/error/error-propagation.mjs:23-36
const level2_readFile = (filename) => {
  console.log(" (L2) 파일을 읽는다고 가정합니다...");
  try {
    const rawData = '{ "data": "some data", "malformed" }';
    return level3_parseData(rawData);
  } catch (err) {
    throw new Error(`(L2) 파일 "${filename}" 처리 중 문제 발생: ${err.message}`, { cause: err });
  }
};
```

**동기 버전**: `throw`/`try...catch`가 콜스택을 타고 자동으로 위로 전파된다. `{ cause: err }` 옵션(Error Cause, Node 16.9+)으로 원본 에러를 잃지 않고 새 에러에 감싸 컨텍스트를 추가한다.

```js
// chapters/chapter3_callback/error/async-error-propagation.mjs:23-35
const level2_readFile = async (filename) => {
  try {
    const rawData = await readFile(filename, 'utf-8');
    return await level3_parseData(rawData);
  } catch (err) {
    throw new Error(`(L2) 파일 "${filename}" 처리 중 문제 발생: ${err.message}`, { cause: err });
  }
};
```

**async/await 버전**: `fs/promises`의 `readFile`을 사용해 동기 버전과 **거의 동일한 문법**(`try/catch`, `throw`)을 유지하면서 실제로는 비동기로 동작한다. `await`가 Promise의 reject를 동기 예외처럼 `catch`로 끌어올려주는 것이 핵심 — L3가 `async` 함수가 아니어도 되지만, 일관성을 위해 async로 통일했다는 주석이 있다.

```js
// chapters/chapter3_callback/error/callback-error-propagation.mjs:21-47
const level2_readFileAndParse = (filename, callback) => {
  readFile(filename, 'utf-8', (readErr, rawData) => {
    if (readErr) {
      return callback(new Error(`(L2) 파일 읽기 실패: ${readErr.message}`));
    }
    level3_parseData(rawData, (parseErr, parsedData) => {
      if (parseErr) {
        return callback(new Error(`(L2) 파일 내용 파싱 실패: ${parseErr.message}`));
      }
      return callback(null, parsedData);
    });
  });
};
```

**콜백(에러 우선) 버전**: `throw`가 전혀 없다. Node의 **에러 우선 콜백 규약**(`callback(err, data)` — 첫 인자가 에러, 성공 시 `null`)을 각 레벨이 명시적으로 검사(`if (err) return callback(err)`)하며 수동으로 릴레이한다. 여기서 `return callback(...)`처럼 **매번 `return`을 붙이는 것이 관용구**다 — 붙이지 않으면 에러 분기 이후 코드가 계속 실행되어 콜백이 두 번 호출되는 전형적 버그가 발생한다.

```js
// chapters/chapter3_callback/error/error.mjs:23-49
function readJsonThrows(filename , cb){
    readFile(filename , 'utf-8' , (err , data) => {
        if(err){
            return cb(err)
        }
        cb(null , JSON.parse(data)); //trycatch가 없기애 에러 안잡히고 , NODE.js 런타임으로 전파됨. 
    })}

try {
    readJsonThrows("data.json" , (err) => {
            console.log('error 입니다: ' , err)
        }); 
}catch(err){
    console.log('this will not print')
}

process.on('uncaughtException' , (err) => {
    console.error("this will catch at last the JSON parsing : " , err.message); 
    process.exit(1)
})
```

가장 중요한 함정 실험: `readJsonThrows`의 콜백 안에서 `JSON.parse(data)`가 던지는 예외는 **`try/catch`로 감싸지 않았기 때문에** 콜백이 실행되는 시점(이벤트 루프의 나중 틱)에는 바깥의 `try { readJsonThrows(...) } catch` 는 **이미 콜스택에서 사라진 뒤**라 절대 잡히지 않는다(주석: `this will not print`). 결과적으로 이 예외는 `process.on('uncaughtException', ...)` 까지 올라가야 잡히고, 거기서도 "상태가 오염됐을 수 있으니" `process.exit(1)`로 즉시 종료하는 것이 권장된다. `readJson`(주석 처리된 대조군)은 `JSON.parse`를 `try/catch`로 감싸 `cb(err)`로 정상 전달하므로 크래시가 나지 않는다 — **"비동기 콜백 안의 예외는 그 콜백 안에서 잡아야 한다"**는 규칙을 실증하는 예제다.

- `data.json`은 유효한 JSON, `invalid-data.json`은 "trailing comma로 의도적으로 깨뜨렸다"는 주석이 붙어 있지만 실제 파일 내용상으로는 trailing comma가 보이지 않는다 — 실습 중 수정이 덜 반영된 흔적으로 보인다.
- `test.mjs`는 async/await 버전 스케치가 전부 주석 처리된 미완성 초안(사용되지 않음).
- **실무 체크포인트**: async/await로 전환된 코드베이스라도 콜백 기반 서드파티 라이브러리를 감쌀 때는 여전히 에러 우선 콜백 규약을 정확히 지켜야 하고(`util.promisify`가 이 규약을 가정함), 콜백 내부의 동기 코드(특히 `JSON.parse`, 사용자 콜백 호출)는 반드시 로컬 `try/catch`로 보호해야 한다.

### Observer 패턴과 EventEmitter (`observer/`)

**기본형 — 함수가 EventEmitter를 반환**

```js
// chapters/chapter3_callback/observer/findRegex.mjs:4-22
function findRegex(files , regex){
    const emitter = new EventEmitter(); 
    for(const file of files){
        readFile(file , 'utf-8' , (err , data) => {
            if(err) { return emitter.emit('error' , err); }
            emitter.emit('fileread' , file); 
            const match = data.match(regex); 
            if(match){
                for(const elem of match){
                    emitter.emit('found' , file , elem);
                }
            }
        })
    }
    return emitter ; 
}
```

`findRegex`는 여러 파일을 비동기로 읽으며 파일마다 `fileread`/`found`/`error` 이벤트를 여러 번 내보낸다. 콜백 하나로는 표현할 수 없는 "다중·불특정 횟수의 알림"을 EventEmitter로 모델링한 것 — 이것이 콜백과 observer 패턴의 근본적 차이다. `readFile`은 항상 비동기이므로, `emitter`를 동기적으로 반환한 직후 `.on(...)`을 체이닝해도 리스너 등록이 실제 파일 읽기 완료보다 항상 먼저 끝난다(=Zalgo 문제가 자연히 해소되는 경우). `'error'` 이벤트는 Node EventEmitter의 특수 이벤트로, 리스너가 하나도 없으면 예외를 던지므로 `process.on('uncaughtException', ...)`을 안전망으로 걸어둔 것도 확인된다.

**클래스형 — EventEmitter 상속 + `this` 바인딩**

```js
// chapters/chapter3_callback/observer/classfindRegex.mjs:4-40
class FindRegex extends EventEmitter {
    constructor(regex){
        super();
        this.regex = regex;
        this.files = [];
    }
    addFile(file){ this.files.push(file); return this; }
    find(){
        for(const file of this.files){
            readFile(file , 'utf-8' ,(err , data) => {
                if(err) { return this.emit('error' , err); }
                this.emit('fileread' , file);
                ...
            })
        }
        return this
    }
}
```

`class FindRegex extends EventEmitter`는 `super()`로 부모의 리스너 목록 초기화 로직을 먼저 실행한 뒤 확장한다. `addFile`/`find`가 모두 `this`를 반환해 `.addFile().addFile().find().on(...).on(...)` 형태의 **메서드 체이닝**을 가능하게 한다. `readFile`의 콜백을 화살표 함수로 작성했기 때문에 `this`가 렉시컬 스코프(=`FindRegex` 인스턴스)를 그대로 유지한다는 점이 핵심 — 만약 일반 `function(){}`으로 썼다면 `this`가 `undefined`(strict mode) 또는 다른 값이 되어 `this.emit`이 깨졌을 것이다. `observer/this.js`는 이 `this` 바인딩 규칙(일반 함수 호출 vs 객체 메서드 호출 vs 화살표 함수의 렉시컬 바인딩)만 따로 연습한 스크래치 파일이다.

**동기 emit의 함정 — 리스너 등록 순서**

```js
// chapters/chapter3_callback/observer/classfindRegexSync.mjs:42-49
findRegexInstance
  .addFile('fileA.txt')
  .addFile('fileB.json')
  //.find() 여기서 이벤트 발생 시키면 동기적이기에 , 뒤에 나오는 이벤트 리스너들이 등록이 안된 상태로 실행됨. 
  .on('fileread', (file) => console.log(`${file} was read`))
  .on('found', (file, match) => console.log(`Matched "${match}" in ${file}`))
  .on('error', (err) => console.error(`Error emitted: ${err.message}`))
  .find()
```

`readFileSync`를 쓰는 동기 버전에서는 `find()`가 즉시(동기적으로) `emit`을 실행하므로, `findRegex.mjs`의 비동기 버전과 달리 **`.find()`를 체인의 맨 마지막(모든 `.on()` 뒤)에 호출해야만** 리스너가 이벤트를 받을 수 있다. 코드 주석이 정확히 이 이유를 설명하고 있다 — EventEmitter 자체는 동기/비동기를 강제하지 않으므로, "발행자가 이벤트를 언제 쏘는가"는 결국 호출자가 API 설계 의도를 알고 순서를 맞춰야 하는 문제이며, 이는 Zalgo 문제의 EventEmitter 버전이라 할 수 있다.

**리스너 메모리 누수**

```js
// chapters/chapter3_callback/observer/memorylick.js:68-76
cleanEmitter.once('request_done', (data) => {
    // ...
});
setTimeout(() => {
    cleanEmitter.emit('request_done', `Processed payload for ${requestId}`);
}, 100);
```

주석 처리된 "누수 시나리오"는 요청마다 `leakyEmitter.on('request_done', listener)`으로 리스너를 계속 추가하면서 `off()`로 제거하지 않으면, 각 리스너가 클로저로 캡처한 `largeData`가 영구히 GC되지 못하고 `listenerCount`가 무한히 증가함을 보여준다(기본적으로 Node는 동일 이벤트에 리스너 10개 초과 시 `MaxListenersExceededWarning`을 출력해 이런 누수를 조기 경고한다). 해법은 일회성 리스너에 **`emitter.once()`**를 사용하는 것 — 이벤트가 한 번 발생하면 자동으로 리스너가 제거되어 `listenerCount`가 절대 누적되지 않는다. 장수하는 EventEmitter(전역 이벤트 버스, 앱 전체 로거 등)에 요청 단위로 리스너를 붙일 때는 반드시 `once` 또는 명시적 `off`/`removeListener`를 고려해야 한다.

**진행률 이벤트 + 프로덕션 다운로더**

```js
// chapters/chapter3_callback/observer/download.mjs:17-29
res
.on('error' , err => {cb(err)})
.on('data' , (chunk) => {
    chunks.push(chunk); 
    downloadBytes+=chunk.length;
    eventEmitter.emit('progress' , downloadBytes , fileSize)
})
.on('end' , () => {
    const buffer = Buffer.concat(chunks);
    cb(null , buffer)
})
```

`download.mjs`는 "최종 결과는 콜백으로, 중간 진행 상황은 이벤트로" 라는 Node 표준 조합(전형적으로 스트림/HTTP 응답 처리에 쓰임)을 보여준다. 다만 `chunks` 배열에 전체를 모았다가 `Buffer.concat`하는 방식은 대용량 파일에서 메모리를 전부 점유하는 문제가 있다.

```js
// chapters/chapter3_callback/observer/productionDownload.mjs:65-90
const fileStream = fs.createWriteStream(dest);
res.pipe(fileStream);
...
res.on('error', (err) => { fs.unlink(dest, () => cb(err)); });
fileStream.on('finish', () => {
    fileStream.close(() => { cb(null, { path: dest, size: downloadedBytes }); });
});
```

`productionDownload.mjs`는 이를 실무 수준으로 확장한다: `res.pipe(fileStream)`으로 메모리에 버퍼링하지 않고 디스크로 스트리밍, 3xx 리다이렉트를 `maxRedirects`까지 재귀적으로(`attemptDownload` 재호출) 추적, 5xx/네트워크 에러는 지수적 백오프(`1500 * retries`)로 `maxRetries`까지 재시도, `req.setTimeout(30000, ...)`으로 응답 없는 요청을 강제 종료, 실패 시 `fs.unlink`로 불완전한 파일을 정리한다. 또한 `if (typeof options === 'function') { cb = options; options = {}; }` 패턴으로 **선택적 인자를 오버로딩**하는 Node 표준 관용구(`fs.readFile(path, [options], cb)`와 동일한 스타일)를 그대로 재현하고 있다.

**연습문제 — Ticker (`observer/exercise/`)**

```js
// chapters/chapter3_callback/observer/exercise/simpleEvent3_1.mjs:23-27
find(){
    process.nextTick(() => {
        this.emit('start' , this.files);
    })
    for(const file of this.files){ ... }
    return this
}
```

3-1 연습문제: "프로세스 시작 시 `start` 이벤트를 입력 파일 목록과 함께, Zalgo 없이(비동기로) 발생시켜라." `this.emit('start', ...)`를 파일 읽기 루프 바깥, `process.nextTick()`으로 감싸 배치한 것이 핵심 — `find()` 자체는 동기적으로 반환되지만 `start` 이벤트는 다음 틱까지 지연되므로, 호출자가 `.find().on('start', ...)`처럼 반환값에 체이닝해도 리스너가 항상 제때 등록된다. 앞서 본 zalgoasync.mjs의 해법과 완전히 동일한 기법이다.

```js
// chapters/chapter3_callback/observer/exercise/Ticker.mjs:9-19 (v1, 문제 있음)
let timerId = setTimeout( function tick(){
    time+=50 ; 
    if(number < time){ clearTimeout(timerId); return cb(null , number/50); }
    emitter.emit('tick' , time) 
    timerId = setTimeout(tick , 50);
}, 50)
```

```js
// chapters/chapter3_callback/observer/exercise/TickerVer2.mjs:19-23 (v2 → v3로 개선)
//doTick()  - 기존 ! 그냥 doTick하니 , 첫번째 이벤트는 on으로 리스너 등록도 되기전에 실행되서 하나 누락됨.... 
// setTimeout(() => doTick() , 50) - ver2. 50 기다리고 태스크큐에 넣어 진행
process.nextTick(doTick) //ver3.  3-3. emit tick immediately after function invoked..
```

3-2/3-3 연습문제 진행 과정이 주석에 그대로 기록돼 있어 사고 과정을 추적할 수 있다: 처음엔 `doTick()`을 동기 호출해 첫 `tick` 이벤트가 리스너 등록 전에 발생해 유실됐고(1차 실패), `setTimeout(doTick, 50)`으로 감싸 고쳤지만 전체 스케줄이 50ms씩 밀리는 부작용이 생겼으며(2차, 차선), 최종적으로 `process.nextTick(doTick)`을 채택해 "다음 틱까지만" 지연시켜 리스너 등록 시간은 확보하면서도 스케줄 정확도를 해치지 않았다(3차, 채택). `Ticker.mjs`의 주석은 왜 `setInterval` 대신 재귀적 `setTimeout`을 쓰는지도 설명한다 — 서버 과부하 시 다음 호출의 지연 시간을 동적으로 조절할 수 있다는 유연성이 `setInterval`(고정 주기)엔 없기 때문.

```js
// chapters/chapter3_callback/observer/exercise/TickerVer3.mjs:44-51
const checkMod = (time) =>{
    if(time % 5 === 0 ){
        console.log(`${time} is divisible by 5`)
        return emitter.emit('error')
    } else {
        return emitter; 
    }
}
```

TickerVer3.mjs는 `tick` 리스너 안에서 `checkMod`를 호출해 조건에 따라 **같은 emitter의 `error` 이벤트를 다시 emit**한다. 즉 리스너 콜백 안에서 재귀적으로 `emit`을 호출하는 패턴인데, EventEmitter는 이런 재진입(reentrant) 호출을 허용하지만 남용하면 호출 스택이 깊어지거나 이벤트 순서를 예측하기 어려워질 수 있어 주의가 필요하다.

- `observer/test1.js`: `emitter.on('events', cb); emitter.emit('events', arg)` 최소 예제 — `EventEmitter` API의 골격만 보여주는 스모크 테스트.
- `fileA.txt` / `fileB.json` (그리고 `exercise/` 아래 동일한 파일들)은 `findRegex` 계열 예제가 정규식 `/hello [\w.]+/g`로 매칭할 고정 픽스처 데이터.

### `process.nextTick` 우선순위 (`priority/`)

```js
// chapters/chapter3_callback/priority/test1.js:1-4
setTimeout(() => {console.log('setTimeout')} , 0)
setImmediate(() => {console.log('setImmediate')})
process.nextTick(() => {console.log('nexttick')})
console.log('sync')
```

네 가지 스케줄링 방식의 우선순위를 한 파일에서 비교한다: **동기 코드(`sync`)가 항상 최우선**으로 즉시 실행되고, 그다음 **`process.nextTick` 큐가 이벤트 루프의 어떤 단계로도 넘어가기 전에 전부 비워진다**(마이크로태스크보다도 먼저 처리됨). `setTimeout(fn, 0)`은 타이머 단계(timers phase)에서, `setImmediate`는 check 단계에서 실행되는데, 최상위 모듈 스코프에서는 이 둘의 순서가 타이머 정밀도에 따라 비결정적이지만, I/O 콜백 내부에서 호출하면 `setImmediate`가 항상 먼저 실행되도록 보장된다.

```js
// chapters/chapter3_callback/priority/recursivenextTick.mjs:1-16
readFile('data.txt' , 'utf-8' , (_err , data) => {
    console.log('Data from file: ' , data)
})

let scheduledNextTicks = 0; 
function recursiveNextTick(){
    if(scheduledNextTicks++ > 1000){ return }
    console.log('Keep the event loop busy');
    process.nextTick(() => {recursiveNextTick()});
}
recursiveNextTick();
```

가장 중요한 실험: `readFile`을 먼저 예약해두고, 곧바로 `process.nextTick`을 최대 1000번까지 재귀적으로 스케줄링한다. **`nextTick` 큐는 완전히 비워질 때까지 이벤트 루프가 poll 단계(I/O 콜백 처리)로 넘어가지 못하므로**, `readFile`의 콜백은 1000번의 재귀가 전부 끝나야만 실행된다 — 즉 무분별한 `process.nextTick` 재귀는 **I/O를 굶기는(starvation)** 결과를 낳는다는 것을 직접 보여주는 예제다. Node 공식 문서도 이 위험성 때문에 `process.nextTick`의 무한/과도한 재귀 사용을 경고한다. 이 파일에서 1000이라는 상한을 둔 것도 결국 I/O 콜백이 실행될 기회를 주기 위한 안전장치다.

- **`priority/data.txt`**: `readFile`이 읽는 픽스처 파일(`some data`).

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가
- 캐시/메모이제이션 함수를 작성할 때 "적중 시 동기, 미스 시 비동기"로 갈리는지 항상 점검하라 — 갈린다면 `process.nextTick`/`queueMicrotask`/Promise로 강제 통일(zalgoasync.mjs)하거나 아예 완전 동기(zalgosync.mjs)로 고정하라.
- 콜백 기반 API를 새로 만들 때는 `callback(err, data)` 규약과 `return callback(...)` 관용구를 지키고, 콜백 내부의 동기 코드(`JSON.parse` 등)는 반드시 로컬 `try/catch`로 감싸라 — 감싸지 않으면 바깥 `try/catch`는 절대 못 잡고 `uncaughtException`까지 튄다(error.mjs).
- 비동기 작업에서 EventEmitter를 반환하는 API를 설계할 때, `emit`이 동기인지 비동기인지에 따라 호출자가 `.on()`을 언제 체이닝해야 하는지가 달라진다 — 동기 emit이면 리스너를 먼저 등록(classfindRegexSync.mjs), 비동기/지연 emit이면 반환 즉시 등록해도 안전(findRegex.mjs, simpleEvent3_1.mjs의 `process.nextTick` 패턴).
- 장수하는 EventEmitter(앱 전역 버스 등)에 요청/세션 단위로 리스너를 붙일 때는 `once()` 또는 명시적 `off()`로 제거해 메모리 누수를 막아라(memorylick.js).
- 다운로드·스트림류 코드를 짤 때는 전체를 메모리에 버퍼링(`Buffer.concat`)하지 말고 `pipe`로 스트리밍하며, 리다이렉트·재시도·타임아웃·부분 파일 정리까지 고려하라(productionDownload.mjs가 체크리스트 역할).
- `process.nextTick`을 재귀적으로 쓸 일이 있다면 I/O 콜백이 굶주릴 수 있음을 기억하고 상한을 두거나 `setImmediate`로 대체하는 것을 검토하라(recursivenextTick.mjs).
