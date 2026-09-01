# Chapter 6 — 스트림 (Streams)

## 개요
이 챕터는 "파일 전체를 메모리에 올리는 **Buffer 방식**"과 "필요한 만큼만 조금씩 처리하는 **Stream 방식**"을 비교하는 것으로 시작해, Readable → Writable → Duplex/Transform 순으로 스트림의 4대 타입을 각각 분해하고, 다시 `pipe()`/`pipeline()`/`compose()`로 조립하는 방향으로 확장된다. 핵심 문제의식은 크게 두 가지다. 첫째는 **메모리 효율**(2GB Buffer 제한, 대용량 파일/네트워크 데이터를 통째로 들고 있을 수 없는 상황)이고, 둘째는 **백프레셔(backpressure)** — 즉 생산자(Readable)와 소비자(Writable) 사이의 처리 속도 차이를 어떻게 자동/수동으로 조율하는가이다. 후반부(07~10)는 스트림을 범용 비동기 제어 흐름 도구로 확장해 순차/동시성 제한 처리, 포킹(fork), 병합(merge), 멀티플렉싱(mux/demux) 패턴을 다루고, 마지막(11~12)은 표준 Web Streams API와 스트림 소비자(consumer) 유틸리티로 마무리한다. `exercise/`와 `lazy-stream/`은 이 개념들을 실전 미니 프로젝트(압축 벤치마크, CSV 통계, TCP 파일 전송, 터미널 애니메이션, 지연 생성 스트림)로 재구성한 응용 코드다.

### 1. Buffer vs Stream (`01-buffer/`)
- Node.js의 `Buffer`는 무한정 커질 수 없다. 실제 상한을 코드로 확인한다.
```js
// 01-buffer/buffer.mjs:1-3
import buffer from 'node:buffer'

console.log(buffer.constants.MAX_LENGTH / (1024 * 1024))
```
  `buffer.constants.MAX_LENGTH`는 V8/OS에 따라 다르지만 보통 GB 단위로 상한이 있다. 즉 "일단 다 읽고 처리"하는 Buffer 방식은 입력 크기가 이 상한을 넘거나 서버 메모리를 압박하면 무너진다.

- 같은 gzip 압축을 **Buffer 방식**과 **Stream 방식**으로 각각 구현해 대비시킨다.
```js
// 01-buffer/gzip-buffer.mjs:1-9  (Buffer 방식 — 전체를 메모리에 올림)
import {readFile , writeFile} from 'node:fs/promises'
import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
const gzipPromise = promisify(gzip);
const filename = process.argv[2];

const data = await readFile(filename);        // 파일 전체를 메모리로
const gzippedData = await gzipPromise(data);   // 압축 결과도 전체가 메모리에
await writeFile(`${filename}.gz`, gzippedData);
```
```js
// 01-buffer/gzip-stream.mjs:1-8  (Stream 방식 — 조각 단위로 흘려보냄)
import {createReadStream , createWriteStream} from 'node:fs'
import {createGzip} from 'node:zlib'
const filename = process.argv[2];

createReadStream(filename)
    .pipe(createGzip())
    .pipe(createWriteStream(`${filename}-short.gz`))
    .on('finish' , () => {console.log('file done')})
```
  Buffer 방식은 코드가 직관적이지만 **입력 파일 전체 크기만큼의 메모리**가 필요하고, 압축 시작 전에 읽기가 100% 끝나야 한다(지연 시간도 큼). Stream 방식은 `highWaterMark`(기본 64KB) 단위 청크만 메모리에 유지하며, 읽기·압축·쓰기가 **동시에 파이프라인처럼** 진행된다. 트레이드오프: 작은 파일이나 원자적 처리(전체 성공/실패만 있어야 하는 트랜잭션성 작업)엔 Buffer가 더 단순하고, 대용량·네트워크·실시간성이 필요하면 Stream이 필수다.

### 2. Readable 스트림 (`02-readable-stream/`)
Readable은 크게 **flowing 모드**(자동으로 데이터가 흐름, `'data'` 이벤트)와 **paused/non-flowing 모드**(소비자가 `read()`를 명시적으로 호출)로 나뉜다.

- **flowing 모드** — `'data'` 리스너를 붙이는 순간 자동 전환되며, 청크 크기·타이밍을 제어할 수 없다.
```js
// 02-readable-stream/02-flow-nonflow/read-flow.mjs:1-12
process.stdin
  .on('data', (chunk) => {
    console.log('New data available')
    console.log(`Chunk read (${chunk.length} bytes): "${chunk.toString()}"`)
  })
  .on('end', () => console.log('End of stream'))
```

- **non-flowing(paused) 모드** — `'readable'` 이벤트가 뜨면 내부 버퍼에서 원하는 만큼 `read(size)`로 직접 꺼낸다. 버퍼에 요청 크기만큼 데이터가 없으면 `read()`는 `null`을 반환하고, 나중에 다시 `'readable'`이 발생한다.
```js
// 02-readable-stream/02-flow-nonflow/read-non-flow.mjs:1-17
process.stdin
  .setEncoding('utf8')
  .on('readable', () => {
    let chunk
    while ((chunk = process.stdin.read()) !== null) {
      console.log(`Chunk read (${chunk.length} bytes): "${chunk}"`)
    }
  })
  .on('end', () => console.log('End of stream'))
```
  `read-non-flow-test.mjs`는 `read(10)`처럼 크기를 못박아 호출했을 때 버퍼에 10바이트가 안 모이면 `null`이 반환되는 걸("not yet" 로그) 직접 확인하는 실험 스크립트다.

- 흐름을 수동으로 멈췄다 재개하는 `pause()`/`resume()`도 flowing 모드 위에서 쓸 수 있다.
```js
// 02-readable-stream/resume-pause-example.mjs:7-19
process.stdin.on('data', (chunk) => {
  console.log(`수신된 내용: "${chunk.toString().trim()}"`);
  process.stdin.pause();
  setTimeout(() => {
    process.stdin.resume();
  }, 2000);
});
```
  `'data'` 리스너를 등록한 시점에 flowing 모드로 전환되지만, `pause()`를 호출하면 즉시 non-flowing으로 되돌아가 내부 버퍼에 데이터가 쌓이기 시작한다. 이렇게 producer 속도를 강제로 늦추는 것도 일종의 수동 백프레셔 제어다.

- **async iterator**로 Readable을 소비하는 현대적 방식 — `for await...of`는 내부적으로 non-flowing 모드처럼 동작하며 각 청크가 준비될 때까지 코드 실행을 일시 정지시킨다.
```js
// 02-readable-stream/03-async-iterator/async-iterator.mjs:1-6
for await (const chunk of process.stdin) {
    console.log('New data available');
    console.log(`Chunk read (${chunk.length} bytes): "${chunk.toString()}"`);
}
console.log('End of stream');
```

- **커스텀 Readable 구현** — `Readable`을 상속해 `_read(size)`를 오버라이드한다. 다른 스트림 타입(Writable/Transform)의 콜백 기반과 달리, Readable은 콜백이 없다: `this.push(chunk)`로 데이터를 내보내고 `this.push(null)`로 EOF를 알린다.
```js
// 02-readable-stream/04-custom-readable/random-stream.mjs:1-19
import {Readable} from 'node:stream'
import Chance from 'chance'
const chance = new Chance();

export class RandomStream extends Readable {
    constructor(options){
        super(options);
        this.emittedBytes = 0;
    }
    _read(size){
        const chunk = chance.string({length:size})
        this.push(chunk, 'utf8')             // 2
        this.emittedBytes += chunk.length
        if (chance.bool({ likelihood: 70 })) { // 3
            this.push(null)
        }
    }
}
```
  `simplified-stream.mjs`는 같은 걸 클래스 상속 없이 **옵션 객체 패턴**(`new Readable({ read(size){...} })`)으로 더 간단히 보여준다. `new Promise((resolve) => {})`와 동일한 생성자-콜백 패턴이라는 주석이 핵심 통찰이다.

- **generator/iterable로 Readable 만들기** — `Readable.from()`은 이터러블(제너레이터, 배열 등)을 게으르게(lazy) 소비하는 스트림으로 감싼다.
```js
// 02-readable-stream/05-custom-readable-iterable/generator-readable.mjs:12-20
function * mountainGenerator () {
    for (const mountain of mountains) {
      yield mountain
    }
}
const mountainsStream = Readable.from(mountainGenerator())
```
  `iterable-readable.mjs`는 `Readable.from(mountains)`(배열을 직접 전달)가 사실 `objectMode: true` + `_read()`에서 인덱스를 증가시키며 `push()`하는 코드의 축약형임을 주석으로 풀어서 보여준다. 소비자가 데이터를 요청할 때만 제너레이터가 진행되므로, 메모리에는 항상 `highWaterMark`만큼의 적은 데이터만 유지된다 — 이게 파일 시스템이 아닌 "즉석 데이터 생성"에서도 스트림이 메모리 효율적인 이유다.

- **스트림 유틸리티(`compose`, async iterator의 배열형 메서드)** — Node 최신 버전은 `Readable`에 `drop`, `map`, `filter`, `reduce` 같은 배열 스타일 메서드를 async iterator 기반으로 제공한다.
```js
// 02-readable-stream/06-utility/utility.mjs:15-52
const readGunzip = compose(
    createReadStream('data.csv.gz'),
    createGunzip()
)
const line = Readable.from(createInterface({ input: readGunzip }))

const totalAmount =
await line
    .drop(1)
    .map(chunk => {
        const [type, country, profit] = chunk.toString().split(',');
        return {type, country, profit: Number(profit)}
    })
    .filter(chunk => chunk.country === 'italy')
    .reduce((acc, chunk) => acc + chunk.profit, 0)
```
  재사용 가능한 Transform 클래스를 따로 만들 필요 없이, 한 번 쓰고 버릴 간단한 집계 로직이라면 이 체이닝 방식이 훨씬 짧다. `reduce()`가 Promise를 반환하므로 `await`로 최종값을 바로 받을 수 있다.

- **`01- gzip/`** 폴더는 실제 네트워크(HTTP) 위에서 Readable/Writable을 연결하는 예제다. 클라이언트는 파일을 읽어 gzip 압축 후 HTTP 요청 바디로 `pipe`하고, 서버는 요청 바디(req 자체가 Readable)를 압축 해제하며 파일로 저장한다.
```js
// 02-readable-stream/01- gzip/gzip-send.mjs:25-30
createReadStream(filename)
    .pipe(createGzip())
    .pipe(req)
    .on('finish', () => { console.log('file successfully sent') })
```
```js
// 02-readable-stream/01- gzip/gzip-receive.mjs:14-21
req
.pipe(createGunzip())
.pipe(createWriteStream(destFilename))
.on('finish' , () => { res.writeHead(201, ...); res.end('OK\n') })
```
  `crypto-gzip-*` 버전은 여기에 `createCipheriv`/`createDecipheriv`(AES-192, HTTP 헤더로 IV 전달)를 파이프 체인에 하나 더 끼워 넣어 "압축 → 암호화 → 전송 → 복호화 → 압축해제 → 저장"의 5단 파이프라인을 만든다. `req`/`res`가 그 자체로 Readable이자 Writable(Duplex 성격)이라는 점, 그리고 `.pipe()`를 계속 체이닝해서 여러 변환을 한 줄로 연결할 수 있다는 점이 이 폴더의 핵심 교훈이다.

### 3. Writable 스트림과 백프레셔 (`03-writable-stream/`)
- **`res.write()`의 반환값**이 백프레셔 신호다. 내부 버퍼가 `highWaterMark`를 넘으면 `write()`는 `false`를 반환하는데, 01번 예제는 이를 무시하고 계속 쓴다.
```js
// 03-writable-stream/01-http-entropy-server/01-entropy-server.mjs:5-11
const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  do {
    res.write(`${chance.string()}\n`)   // 반환값을 확인하지 않음 -> 메모리 무한정 축적 위험
  } while (chance.bool({ likelihood: 95 }))
  res.end('\n\n')
})
```
- 02번 예제가 이를 올바르게 고친 버전이다: `write()`가 `false`를 반환하면 즉시 쓰기를 멈추고 `'drain'` 이벤트가 발생할 때까지 기다렸다가 재개한다.
```js
// 03-writable-stream/02-http-entropy-server-backpressure/02-backpressure-server.mjs:12-25
(function generateMore(){
    do{
        const chunk = chance.string({length: CHUNK_SIZE});
        const available = res.write(`${chunk}\n`);
        byteSent += CHUNK_SIZE
        if(!available){
            console.warn(`back-pressure x${++backPressureCount}`)
            return res.once('drain', generateMore)   // 버퍼가 비워지면 재귀 재개
        }
    }while(chance.bool({likelihood: 50}))
    res.end(`\n\n-----END------`)
})()
```
  이것이 이 챕터에서 가장 중요한 패턴 중 하나다. `pipe()`를 쓰면 Node가 이 `write()`/`drain` 로직을 자동으로 처리해주지만, 직접 `write()`를 호출하는 코드(HTTP 응답 스트리밍, 커스텀 프로토콜 등)에서는 개발자가 반드시 반환값을 확인하고 `drain`을 기다려야 한다. 그렇지 않으면 느린 클라이언트(느린 네트워크) 하나가 서버 메모리를 무한정 잡아먹을 수 있다.

- **커스텀 Writable** — `_write(chunk, encoding, callback)`를 구현하고, 비동기 작업이 끝나면 반드시 `callback()`을 호출해야 다음 쓰기가 진행된다. `objectMode: true`를 켜면 문자열/버퍼가 아닌 임의의 JS 객체를 청크로 다룰 수 있다.
```js
// 03-writable-stream/03-custom-writable-to-file/to-file-stream.mjs:6-19
export class ToFileStream extends Writable {
    constructor(options){
        super({...options, objectMode: true})
    }
    _write(chunk, _encoding, cb){
        mkdirp(dirname(chunk.path))
            .then(() => writeFile(chunk.path, chunk.content))
            .then(() => cb())
            .catch(cb)
    }
}
```
  `objectMode`를 빼면 `chunk`가 문자열/Buffer가 아닌 일반 Object라서 `TypeError [ERR_INVALID_ARG_TYPE]`가 발생한다는 걸 주석으로 남겨둔 게 실전 디버깅에 유용하다. `index.mjs`에서 `tfs.write({path, content})`를 세 번 호출하고 `tfs.end(cb)`로 마무리하는 사용 패턴도 함께 확인할 수 있다.

### 4. Transform 스트림 (`04-transform-stream/`)
Transform은 Duplex(Readable+Writable)의 특수화로, 입력 청크를 받아 가공한 뒤 출력하는 스트림이다. `_transform(chunk, encoding, callback)`이 매 청크마다 호출되고, `_flush(callback)`은 `.end()` 호출 시(스트림이 끝날 때) 딱 한 번만 호출된다.

- **경계를 넘는 검색/치환** — 청크 단위로 잘려 들어오는 데이터에서 검색어가 청크 경계에 걸치는 문제를, 이전 청크의 꼬리를 `tail`에 저장해두는 방식으로 해결한다.
```js
// 04-transform-stream/01-custom-transform/01-replace-stream/replaceStream.mjs:10-24
_transform(chunk, _encoding, cb) {
    const pieces = (this.tail + chunk).split(this.searchStr) // 1
    const lastPiece = pieces[pieces.length - 1]               // 2
    const tailLen = this.searchStr.length - 1
    this.tail = lastPiece.slice(-tailLen)
    pieces[pieces.length - 1] = lastPiece.slice(0, -tailLen)
    this.push(pieces.join(this.replaceStr))                   // 3
    cb()
}
_flush(cb) {
    this.push(this.tail)   // 남은 꼬리를 마지막에 흘려보냄
    cb()
}
```
  `simple-transform.mjs`는 클래스 없이 옵션 객체(`new Transform({transform(){...}, flush(){...}})`)로 동일 로직을 구현한 버전이고, `replacePipe.mjs`는 `process.stdin.pipe(new ReplaceStream(...)).pipe(process.stdout)`로 CLI 필터처럼 재사용하는 실전 사용례다.

- **CSV 조건부 필터링** — Transform에서 `push()`를 조건부로 호출하면 특정 레코드만 다음 단계로 통과시키는 필터 스트림을 만들 수 있다.
```js
// 04-transform-stream/02-filter/filter-by-country.mjs:9-16
_transform(record , _encoding , cb){
    if(record.country === this.country){
        this.push(record)   // 조건을 만족할 때만 다음 스트림으로 전달
    }
    cb()   // push 여부와 무관하게 항상 호출 — "이 청크 처리 끝, 다음 청크 받을 준비 됨"
}
```
  `sum-profit.mjs`는 `_transform`에서는 누적만 하고, `_flush`에서 최종 합계를 한 번 `push`하는 **리듀서 스트림** 패턴을 보여준다. `index.mjs`는 `createReadStream → csv-parse Parser → FilterByCountry → sumProfit → process.stdout`로 4단 파이프라인을 구성한다.

- **PassThrough로 관측(observability)** — `PassThrough`는 데이터를 변형 없이 그대로 통과시키면서, 그 사이에 꽂아 부수효과(바이트 카운트, 로깅, 진행률 계산 등)를 관찰하는 용도로 쓴다.
```js
// 04-transform-stream/03-observability/01-passthrough-monitoring.mjs:8-21
const monitor = new PassThrough()
monitor.on('data', chunk => { bytesWritten += chunk.length })

createReadStream(filename)
    .pipe(monitor)              // 압축 전 바이트 수를 측정
    .pipe(createGzip())
    // .pipe(monitor)           // 압축 후 위치로 옮기면 압축된 바이트 수를 측정 가능
    .pipe(createWriteStream(`${filename}.gz`))
```
  `monitor`를 파이프라인의 어느 위치에 꽂느냐에 따라 압축 전/후 바이트 수를 비교할 수 있다는 점이 실습 포인트다.

- **Writable ↔ Readable 어댑터로서의 PassThrough(`upload/`)** — 많은 비동기 유틸리티(`axios.post` 등)는 Readable을 인자로 받도록 설계되어 있는데, 반대로 "쓰기 가능한 스트림"을 사용자에게 내주고 싶을 때 `PassThrough`가 두 방향을 이어주는 다리 역할을 한다.
```js
// 04-transform-stream/upload/upload-cli.mjs:9-20
const contentStream = new PassThrough(); // #1: 아직 비어있는 Readable/Writable 겸용 스트림

upload(`${filename}.br`, contentStream)   // upload()는 Readable을 기대 -> contentStream을 Readable 측면으로 사용
    .then(res => console.log('server res : ', res.data))

createReadStream(filepath)                // #2: 실제 데이터는 여기서부터 흐르기 시작
    .pipe(createBrotliCompress())
    .pipe(contentStream)                  // contentStream을 Writable 측면으로 사용
```
  `upload-stream.mjs`는 이 패턴을 함수로 캡슐화해 `createUploadStream(filename)`이 즉시 내부적으로 `upload()`를 호출해두고, 사용자에게는 단순히 `.write()`/`.end()`만 하면 되는 Writable을 반환하는 구조로 정리한다. "Readable을 받는 API"를 "Writable을 주는 API"로 뒤집는 이 트릭은 실무에서 스트리밍 업로드 SDK를 감쌀 때 자주 쓰인다.

### 5. `pipe()`와 `pipeline()` — 연결과 에러 처리 (`05-pipe/`)
- `.pipe()`는 반환값이 **목적지(destination) 스트림**이라 체이닝이 가능하지만, 에러 발생 시 파이프가 자동으로 해제되지 않고(파일 디스크립터 leak, `unpipe` 필요) 각 스트림에 개별적으로 `'error'` 리스너를 달아야 하는 부담이 있다.
```js
// 05-pipe/03-uppercasify-gzipped.mjs:36-41
createReadStream(filename)
    .pipe(createGunzip())
    .pipe(new toUpperCase())
    .pipe(createGzip())
    .pipe(process.stdout)
    .on('finish' , () => {console.log('done')})
```
- `node:stream/promises`의 **`pipeline()`**은 여러 스트림을 인자로 나열하면 내부적으로 순서대로 연결하고, 하나라도 에러가 나면 전체 체인을 정리(destroy)해준다. `Promise` 기반이라 `await`/`try-catch`로 깔끔하게 에러를 처리할 수 있다.
```js
// 05-pipe/02-uppercase-pipeline.mjs:12-22
try{
    await pipeline(
        process.stdin,
        createGunzip(),
        uppercasify,
        createGzip(),
        process.stdout
    )
}catch(err){
    console.error(err)
    process.exit(1)
}
```
- `01-test-pipe.mjs`는 `pipe()` 반환값이 실제로 다음 스트림에 연결하는 데 쓰이는 걸 확인하는 최소 예제이며, `pipe()`/`pipeline()`이 **최종(마지막) 스트림 객체를 반환한다**는 사실은 `06-combined-streams/pipe-pipelines-chaining-test.mjs`에서 `assert.equal`로 명시적으로 검증한다(아래 6번 참고).

### 6. 스트림 조합(compose)과 체이닝 (`06-combined-streams/`)
- **`compose()`** — 여러 스트림(보통 Transform류)을 하나의 **재사용 가능한 Duplex 스트림**으로 미리 조립해두는 함수. `pipeline()`과의 차이가 핵심이다: `compose()`는 **게으르다(lazy)** — 호출 시점엔 아무 데이터도 흐르지 않고 새 스트림 객체만 반환한다. 반면 `pipeline()`은 **즉시(eager)** 데이터 흐름을 시작시킨다.
```js
// 06-combined-streams/compose-stream.mjs:24-36
// 1. compose()로 재사용 가능한 컴포넌트 생성 — 이 시점엔 아무 일도 안 일어남
const formattingStream = compose(addHeader, toUpperCase);

// 2. pipeline()으로 실제 흐름 실행 — 조립된 스트림을 하나의 스텝처럼 사용
await pipelineAsync(
  createReadStream('/home/user/node-design-system/package.json'),
  formattingStream,
  createWriteStream('package-uppercase.json.md')
)
```
  이 패턴 덕분에 "압축+암호화" 같은 조합 로직을 함수 하나로 캡슐화해 재사용할 수 있다.
```js
// 06-combined-streams/combined-stream-crypto.mjs:8-21
export function createCompressAndEncrypt(password, iv) {
    const key = createKey(password)
    const combinedStream = compose(
        createGzip(),
        createCipheriv('aes192', key, iv)
    )
    combinedStream.iv = iv
    return combinedStream
}
export function createDecryptAndDecompress(password, iv){
    const key = createKey(password)
    return compose(createDecipheriv('aes-192', key, iv), createGunzip())
}
```
  `archive.mjs`/`unarchive.mjs`는 이 조합 스트림을 `pipeline(createReadStream(source), createCompressAndEncrypt(...), createWriteStream(dest), cb)`처럼 마치 하나의 Transform인 것처럼 파이프라인 중간에 끼워 사용한다 — compose의 목적이 "여러 단계를 외부에서는 단일 스트림으로 보이게 캡슐화"하는 것임을 잘 보여준다.

- **`pipe()`/`pipeline()`은 항상 마지막 스트림을 반환**한다는 사실을 단언(assert)으로 증명한다.
```js
// 06-combined-streams/pipe-pipelines-chaining-test.mjs:13-19
const pipelineReturn = pipeline(streamA, streamB, streamC, () => {})
assert.equal(streamC, pipelineReturn) // valid
const pipeReturn = streamA.pipe(streamB).pipe(streamC)
assert.equal(streamC, pipeReturn) // valid
```
  즉 `pipeReturn`은 새 스트림이 아니라 `streamC`와 동일한 참조다 — 체이닝 문법이 성립하는 이유이자, "pipe의 반환값으로 파이프라인 전체를 대표하는 객체를 얻을 수 있다"는 흔한 오해를 바로잡는 코드다.

### 7. 스트림 기반 비동기 제어 흐름 — 순차/동시성 (`07-async-controlFlow/`)
스트림은 파일/네트워크 데이터 처리뿐 아니라, **비동기 작업 목록을 순차 또는 동시성 제한하에 처리하는 범용 제어 흐름 도구**로도 쓸 수 있다.

- **순차 처리(01-sequential)** — 여러 파일을 순서대로 하나의 목적지 스트림에 이어붙인다. `Readable.from(files)`로 파일명 목록을 스트림화하고, Transform 안에서 각 파일을 완전히 다 쓴 뒤(`'finish'`)에야 `done()`을 호출해 다음 파일명으로 넘어가게 강제한다.
```js
// 07-async-controlFlow/01-sequential/concat-files.mjs:9-18
Readable.from(files)
    .pipe(
        new Transform({
            objectMode: true,
            transform(filename, _enc, done){
                createReadStream(filename, {end: false})
                    .pipe(destStream)
                    .on('error', done)
                    .on('finish', done)   // 이 파일이 다 써진 뒤에야 다음 filename을 처리
            }
        })
    )
```
  `{end: false}`로 개별 `createReadStream`이 끝나도 `destStream`이 자동으로 닫히지 않게 막고, 모든 파일이 끝난 뒤 명시적으로 `destStream.end()`를 호출하는 것이 포인트다(주석: `end`가 `close`보다 안전 — 버퍼된 데이터가 모두 flush된 뒤에만 `finish`가 발생).

- **동시성 무제한(02-concurrent, `ConcurrentStream`)** — Transform을 상속해 `_transform`에서 `done()`을 **즉시** 호출해버리면, 스트림 내부적으로 다음 청크가 바로 들어오기 때문에 사실상 모든 비동기 작업이 동시에 시작된다. 대신 실행 중인 작업 수(`running`)를 직접 세어, 스트림 종료(`_flush`) 시점에 아직 끝나지 않은 작업이 있으면 종료 콜백을 잠시 보류해둔다.
```js
// 07-async-controlFlow/02-concurrent/concurrent-stream.mjs:10-36
_transform(chunk, enc, done){
    this.running++
    this.userTransform(chunk, enc, this.push.bind(this), this._onComplete.bind(this))
    done()   // 백프레셔를 걸지 않고 바로 다음 청크를 받음 -> 동시 실행
}
_flush(done){
    if(this.running > 0){
        this.terminateCb = done   // 아직 실행 중이면 스트림을 끝내지 않고 보류
    }else{
        done()
    }
}
_onComplete(err){
    this.running--
    if(err) return this.emit('error', err)
    if(this.running === 0) this.terminateCb?.()   // 마지막 작업이 끝나면 그제서야 종료
}
```
  이 패턴을 URL 헬스체크에 적용한 게 `check-urls.mjs`로, `fetch(url, {method:'HEAD', signal: AbortSignal.timeout(5000)})` 결과에 따라 `push('up'/'down')`한다. `seq-check-urls.mjs`는 같은 문제를 그냥 `Transform`에서 `await` 후 `done()`을 호출하는 방식으로 풀어 **순차** 버전과 비교할 수 있게 해준다(동시성 无 → 한 번에 하나씩만 처리, 느림).

- **동시성 제한(limit-ordered / limit-unordered)** — 무제한 동시성은 자원 고갈(파일 디스크립터, 소켓 등) 위험이 있어, `concurrency` 상한을 두고 초과 시 `done()` 호출을 보류하는 `LimitConcurrentStream`을 직접 구현한다.
```js
// 07-async-controlFlow/02-concurrent/limit-unordered/limit-concurrent-stream.mjs:12-25
_transform(chunk, enc, done){
    this.running++
    this.userTransform(chunk, enc, this.push.bind(this), this._onComplete.bind(this))
    if(this.running < this.concurrency){
        done()                      // 아직 여유 있으면 바로 다음 청크 요청
    }else{
        this.continueCb = done      // 한도에 도달했으면 done 자체를 보류(=백프레셔)
    }
}
_onComplete(err){
    this.running--
    if(err) return this.emit('error', err)
    if(this.running === 0) this.terminateCb?.()
    const temp = this.continueCb
    this.continueCb = null          // 콜백을 먼저 null로 비우고 호출 — 이중 호출 방지
    temp?.()
}
```
  `done()` 콜백을 즉시 비우고 나서 호출하는 `const temp = this.continueCb; this.continueCb = null; temp?.()` 패턴은, 만약 비동기 작업이 다음 `_transform` 호출보다 먼저 두 번 완료되어버리는 경쟁 상황에서 **같은 `done`이 중복 호출되는 버그**(Node 스트림은 콜백이 정확히 한 번만 불려야 한다고 가정함)를 막기 위한 방어 코드다. `limit-ordered/`는 서드파티 `parallel-transform` 패키지(`ordered: true`)로 같은 문제(입력 순서를 유지하며 동시성 제한)를 라이브러리로 대체한 버전이다.

### 8. 스트림 포킹 (Forking) (`08-forking-stream/`)
하나의 Readable을 **여러 목적지**로 동시에 `pipe()`하면, 각 목적지는 같은 데이터를 병렬로 소비한다(단 데이터를 변형하지 않는 소비자여야 경쟁 조건이 없다).
```js
// 08-forking-stream/forkingStream.mjs:1-8
const inputStream = createReadStream(filename)
inputStream.pipe(sha1Stream).pipe(createWriteStream(`${filename}.sha1`))
inputStream.pipe(md5Stream).pipe(createWriteStream(`${filename}.md5`))
// 같은 청크가 sha1Stream/md5Stream 양쪽에 전달됨.
// 둘 다 "읽기만" 하고 원본 청크를 수정하지 않으므로 경쟁 조건이 없음.
```
  주석에는 "만약 Transform이 `chunk[0] = 97`처럼 원본 청크를 직접 변경(mutate)한다면 fork된 다른 목적지가 오염된 데이터를 받는 위험한 사례"도 코드로 남겨두었다 — fork 패턴을 쓸 땐 각 분기 스트림이 **읽기 전용**이어야 한다는 원칙이 중요하다.
- `correct-stream-forking.mjs`는 `createReadStream` 하나를 `PassThrough`(splitter)로 한 번 받은 뒤 그 splitter를 다시 fork하는 방식도 실험하고, `delayedStream.mjs`는 fork된 두 분기 중 하나가 느릴 때(`setTimeout` 20ms 지연) 다른 분기가 먼저 `'finish'`를 발생시킬 수 있음을 `highWaterMark: 20`(작은 청크)으로 관찰한다 — **fork된 스트림들은 서로 독립적인 속도로 진행**되므로 동기화가 필요하면 별도로 카운팅해야 함을 보여준다.

### 9. 스트림 병합 (Merge) (`09-merge-stream/`)
여러 개의 소스 스트림을 **하나의 목적지**로 합치는 패턴. `readline`(`createInterface`)으로 파일을 줄 단위로 읽어 `Readable.from()`으로 감싸고, 여러 소스를 순회하며 같은 `destStream`에 `{end: false}` 옵션으로 파이프한다.
```js
// 09-merge-stream/mergeStream.mjs:9-29
for (const source of sources) {   // 동기적으로 도는 것처럼 보이지만 실제 파이프는 거의 동시에 시작됨 -> 출력 순서는 보장되지 않음
  const sourceStream = createReadStream(source, { highWaterMark: 16 })
  const linesStream = Readable.from(createInterface({ input: sourceStream }))
  sourceStream.on('end', () => {
    if (++endCount === sources.length) {
      destStream.end()          // 모든 소스가 끝난 뒤에만 목적지를 닫음
    }
  })
  linesStream
    .pipe(addLineEnd)
    .pipe(destStream, { end: false })   // end:false 없으면 첫 소스가 끝나자마자 destStream이 닫혀버림
}
```
  `{end: false}`가 없으면 가장 먼저 끝난 소스 파일이 자동으로 `destStream.end()`를 유발해 나머지 파일 데이터가 유실된다는 점, 그리고 `endCount`로 "모든 소스가 끝났는지"를 직접 추적해야 한다는 점이 병합 패턴의 핵심 함정이다. 병합은 fork의 반대 방향(N개 소스 → 1개 목적지)이며, 순서를 보장하지 않는다(동시에 여러 파이프가 진행되므로).

### 10. 멀티플렉싱/디멀티플렉싱 (mux/demux) (`10-mux-demux/`)
여러 개의 독립적인 논리 채널(예: 자식 프로세스의 `stdout`, `stderr`)을 **하나의 물리 채널**(TCP 소켓)로 합쳐 보내고(mux), 반대편에서 다시 원래 채널로 분리(demux)하는 저수준 프로토콜 설계 패턴이다.
- **mux(클라이언트)** — 각 소스 앞에 `[채널ID(1byte)][길이(4byte)][데이터]` 형태의 헤더를 붙여 하나의 소켓에 순서대로 write한다.
```js
// 10-mux-demux/client.js:5-26
function multiplexChannels(sources, destination){
    let openSource = sources.length
    for (let i = 0; i < sources.length; i++){
        sources[i].on('readable', () => {
            let chunk
            while((chunk = sources[i].read()) !== null){
                let outbuff = Buffer.alloc(1+4+chunk.length)
                outbuff.writeUInt8(i, 0)              // 채널 ID
                outbuff.writeUInt32BE(chunk.length, 1) // 청크 길이
                chunk.copy(outbuff, 5)                 // 실제 데이터
                destination.write(outbuff)
            }
        }).on('end', () => { if(--openSource === 0) destination.end() })
    }
}
```
- **demux(서버)** — 소켓에서 읽을 때 상태 머신처럼 "채널ID를 읽는 단계 → 길이를 읽는 단계 → 본문을 읽는 단계"를 오가며, 각 단계에서 `read(n)`이 `null`이면(아직 도착 안 함) 그냥 리턴하고 다음 `'readable'`을 기다린다.
```js
// 10-mux-demux/server.js:4-29
source.on('readable', () => {
    let chunk
    if (currentChannel === null) {
        chunk = source.read(1)
        currentChannel = chunk?.readUInt8(0)
        if(currentChannel === null) return null
    }
    if (currentLength === null) {
        chunk = source.read(4)
        currentLength = chunk?.readUInt32BE(0)
        if(currentLength === null) return null
    }
    chunk = source.read(currentLength)
    if(chunk === null) return null
    destinations[currentChannel].write(chunk)
    currentChannel = null; currentLength = null
})
```
  `exercise/file-transfer-tcp-03/`의 `file-transfer-client.mjs`/`file-transfer-server.mjs`가 이 mux/demux 프레이밍 프로토콜을 "여러 파일을 하나의 TCP 연결로 동시에 전송"하는 실전 과제에 그대로 응용한 사례다. 서버 쪽에서 `channelId`/`channelLength` 등의 상태를 **소켓 콜백 내부 지역 변수(클로저)로 선언**해야, 동시에 접속한 여러 클라이언트의 상태가 서로 오염되지 않는다는 주석이 실무적으로 중요하다.

### 11. Web Streams API (`11-web-stream/`)
Node.js는 브라우저 표준 Web Streams(WHATWG)와 자체 스트림을 상호 변환하는 어댑터를 제공한다.
```js
// 11-web-stream/webStream.mjs:3-11
const nodeReadable = new Readable({
  read() {
    this.push('Hello, ')
    this.push('world!')
    this.push(null)
  },
})
const webReadable = Readable.toWeb(nodeReadable)
nodeReadable.pipe(process.stdout)
webReadable.pipeTo(Writable.toWeb(process.stdout))
```
  `Readable.toWeb()`/`Writable.toWeb()`(그리고 반대 방향 `Readable.fromWeb()`)로 Node 네이티브 스트림 ↔ 표준 `ReadableStream`/`WritableStream`을 오간다. `fetch()`의 `response.body`가 바로 Web `ReadableStream`이므로, Node 생태계 라이브러리(파이프라인, `zlib` 등)와 섞어 쓸 때 이 변환이 필요해진다.

### 12. 스트림 소비자(consumer) 유틸리티 (`12-consumer/`)
스트림에서 최종적으로 전체 내용을 문자열/버퍼/JSON으로 "한 번에" 뽑아내야 할 때의 관용구 비교다.
```js
// 12-consumer/non-consumer-module.mjs:1-6  (수동으로 버퍼링 — 흔한 실수 패턴)
const req = request('http://example.com/somefile.json', res => {
    let buffer
    res.on('data', chunk => buffer += chunk)   // undefined + chunk 부터 시작, 문자열 누적
    res.on('end', () => console.log(JSON.parse(buffer)))
})
```
```js
// 12-consumer/consumer-module.mjs:1-16  (node:stream/consumers 사용)
import consumers from 'node:stream/consumers'
const req = request('https://example.com/somefile.json', async res => {
    const text = await consumers.text(res)
    // consumers.blob(res) / consumers.buffer(res) / consumers.json(res) 도 가능
    console.log(text)
})
```
  `node:stream/consumers`(`text`/`json`/`buffer`/`blob`)를 쓰면 수동 `'data'`/`'end'` 누적 코드를 없앨 수 있다. 단, 스트림은 **한 번만 소비 가능**하므로 `consumers.text(res)`가 끝나면 `res`는 이미 비어 있다는 주석이 실무 함정을 짚는다. `consumer-fetch.mjs`는 표준 `fetch()`가 이미 `.json()`/`.text()`/`.blob()`/`.arrayBuffer()` 형태로 consumer를 내장하고 있음을 보여준다(단, Node 전용 `Buffer` 변환은 내장돼 있지 않음).

### 13. Lazy Stream — 필요할 때까지 리소스 생성을 미루기 (`lazy-stream/`)
`createReadStream()`은 호출 즉시 파일을 열고(파일 디스크립터 할당) 대기한다. 수백 개의 요청을 동시에 받는 서버에서 응답을 아직 보낼 준비가 안 됐는데도 이렇게 파일을 미리 다 열어두면, OS의 프로세스당 파일 디스크립터 한도에 부딪힐 수 있다. `lazy-stream/`은 `PassThrough`를 상속해 실제 소스 스트림 생성을 **첫 `_read()` 호출 시점까지 지연**시키는 패턴을 구현한다.
```js
// lazy-stream/lazyStream.mjs:4-27
class lazyStream extends PassThrough{
    constructor(input, options){
        super(options)
        this.input = input
        this.factory = () => createReadStream(this.input)
        this.initialized = false
    }
    _read(size){
        super._read(size)
        if(!this.initialized){
            const realStream = this.factory()   // 소비가 시작되는 시점에만 실제 파일을 염
            realStream.pipe(this)
            realStream.on('error', (err) => this.emit('error', err))
            this.initialized = true
        }
    }
}
```
  `test-normal.mjs`는 이를 일반 `createReadStream()`과 나란히 비교해, 일반 방식은 `createReadStream()` 호출 즉시 파일 디스크립터가 할당되는 반면 `lazyStream`은 가벼운 JS 객체만 만들고 실제 소비가 시작될 때(`.pipe()`가 걸려 `_read()`가 처음 호출될 때)에야 자원을 연다는 걸 5초 지연 실험으로 보여준다. 수백 개의 지연된 클라이언트 요청을 다뤄야 하는 서버에서 자원 사용을 최소화하는 실전 기법이다.

### 14. 연습문제 (`exercise/`)
- **`data-compression-efficiency-01/`** — 동일 입력을 Brotli/Gzip/Deflate 세 알고리즘으로 각각 압축해 시간을 비교한다. `index-correct.mjs`는 `createReadStream`을 **한 번만** 만들어 세 개의 압축 스트림에 fork(8번 패턴 재사용)하는 올바른 구조이고, `index.mjs`/`index2.mjs`는 저자 본인이 "for 반복으로 정리하려다 fork의 핵심(단일 읽기 스트림 재사용)을 놓쳤다"고 스스로 반성 주석을 남긴 시행착오 버전이다 — fork 패턴을 배운 뒤에도 실전에서 놓치기 쉬운 지점을 보여주는 좋은 반례다.
- **`data-processing-02/`** — 런던 범죄 데이터 CSV를 파싱해 연도별 추세, 자치구별 범죄 건수, 자치구별 최다/최소 범죄 유형을 계산한다. 하나의 `csvParser`(Transform)를 만들고 그 뒤에 `check1`/`check2`/`check3` 세 개의 집계용 Transform/PassThrough를 **fork**로 붙이는 구조다. 주석에 `compose(lineStream, makeCsvParser)`로 만들면 같은 Readable 소스를 두 번 파이핑하는 문제가 생긴다는 걸 발견하고, 대신 `csvParser` 하나를 만들어 그것을 여러 번 fork하는 방식으로 고친 히스토리가 남아 있다.
- **`file-transfer-tcp-03/`** — 여러 파일을 하나의 TCP 연결로 동시 전송하는 mux/demux(10번) 응용 과제. 서버 쪽에서 채널별 상태(`channelId`, `channelLength`)를 소켓 콜백의 **지역 변수(클로저)**로 두어 동시 접속 클라이언트끼리 상태가 섞이지 않게 하는 이유를 주석으로 설명한다. `encyption/` 하위에 TLS(`node:tls`)로 암호화 채널을 얹으려는 시도가 있으나 `tls-server.mjs`는 빈 파일로 미완성 상태다.
- **`parrot-live-04/`** — 커스텀 Readable(`AnimationStream`)이 `_read()` 안에서 `setTimeout`으로 프레임 전환을 지연시키며 ANSI 이스케이프 코드로 터미널 화면을 지우고 다시 그리는 애니메이션. `_read()`가 비동기 타이밍 제어(setTimeout)까지 담당할 수 있음을 보여주는 예제로, 프레임 데이터가 담긴 `frames/0.txt`~`9.txt`를 순환 재생한다.

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가
- 대용량 파일/네트워크 데이터를 다루는데 `readFile`/`await`로 전체를 메모리에 올리고 있다면 → **1번(Buffer vs Stream)** 을 다시 보고 `createReadStream().pipe(...)`로 전환을 검토한다.
- `res.write()`/커스텀 `write()`를 직접 호출하는 코드를 짜는데 반환값을 무시하고 있다면 → **3번(백프레셔)** 의 `drain` 패턴을 반드시 적용한다. `pipe()`/`pipeline()`을 쓸 수 있다면 그게 항상 우선이다.
- 여러 스트림 단계를 에러 안전하게 연결하고 싶다면 → `.pipe().pipe()...` 대신 **5번의 `pipeline()`**을 기본값으로 쓴다.
- 압축+암호화처럼 "여러 단계를 하나의 재사용 가능한 컴포넌트"로 캡슐화하고 싶다면 → **6번의 `compose()`**(lazy) vs `pipeline()`(eager)의 차이를 다시 확인한다.
- 파일 처리/비동기 작업 목록을 "순서 유지 + 동시성 제한"으로 처리해야 한다면 → **7번의 `LimitConcurrentStream`** 패턴(또는 `parallel-transform`)을 재사용한다.
- 하나의 소스를 여러 목적지로 나누거나(fork, 8번) 여러 소스를 하나로 합칠 때(merge, 9번) → fork는 각 분기가 **읽기 전용**이어야 하고, merge는 `{end:false}` + 종료 카운팅이 필요하다는 함정을 잊지 않는다.
- 서버가 다수의 지연된 클라이언트를 다뤄야 하는데 자원(파일 디스크립터, 커넥션)을 미리 다 열어두고 있다면 → **13번(lazy-stream)** 패턴으로 실제 소비 시점까지 생성을 미루는 걸 고려한다.
