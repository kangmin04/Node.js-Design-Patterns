# Chapter 4 — 콜백 기반 비동기 제어 흐름

## 개요
이 챕터는 async/await나 Promise 없이 **순수 콜백만으로** 순차 실행, 무제한 병렬 실행, 제한된 병렬 실행이라는 세 가지 제어 흐름 패턴을 손으로 직접 구현하며, 그 과정에서 콜백 지옥·경쟁 상태(race condition)·Zalgo 문제·중복 콜백 호출 같은 콜백 기반 비동기 프로그래밍의 함정을 체감하게 만든다. 중심 예제는 **웹 스파이더**(링크를 재귀적으로 따라가며 페이지를 다운로드하는 크롤러)이며, `spider1`(단일 페이지 다운로드) → `spider2`(재귀적 순차 크롤링) → `spider3`(무제한 병렬 → 경쟁 상태 → `TaskQueue`로 제한된 병렬) → `spider4`(재귀 호출 자체를 큐에 위임하는 완성형 `TaskQueue`)로 4단계에 걸쳐 점진적으로 발전한다. `exercise/` 폴더에는 이 패턴들을 변형 적용한 4개의 연습문제(파일 병합, 재귀적 파일 목록, 키워드 재귀 검색, 깨진 링크 검사)가 있으며, 각 문제마다 `idea.md`(설계 스케치) → V1(버그 있는 초안) → V2/V3(경쟁 상태·중복 콜백을 고친 개선판) 순서로 파일이 쌓여 있어, 저자 스스로 시행착오를 거쳐 안전한 비동기 패턴에 수렴해가는 과정을 그대로 볼 수 있다.

### 콜백 지옥과 그 첫 완화 — spider1
가장 단순한 형태인 `spider1.mjs`는 콜백을 4단계(파일 존재 확인 → 다운로드 → 디렉터리 생성 → 파일 쓰기)로 중첩시켜 전형적인 **콜백 지옥(callback hell / pyramid of doom)** 을 보여준다.

```js
// chapters/chapter4_asyncCallback/webspider/spider1/spider1.mjs:6-35
export function spider(url, cb) {
    const filename = urlToFilename(url)
    exists(filename, (err, alreadyExists) => { // 1
      if (err) { // 1.1
        cb(err)
      } else if (alreadyExists) { // 1.2
        cb(null, filename, false)
      } else { // 1.3
        console.log(`Downloading ${url} into ${filename}`)
        get(url, (err, content) => { // 2
          if (err) {
            cb(err)
          } else {
            recursiveMkdir(dirname(filename), err => { // 3
              if (err) {
                cb(err)
              } else {
                writeFile(filename, content, err => { // 4
                  ...
```

`if/else`로 매 단계 에러를 분기하다 보니 들여쓰기가 계속 깊어진다. 바로 옆의 `spider1_better.mjs`는 같은 로직을 **조기 반환(early return, `return cb(err)`)** 과 **함수 분리**(`download`, `saveFile`)로 정리해, 들여쓰기 깊이를 1단계로 평탄화한다.

```js
// chapters/chapter4_asyncCallback/webspider/spider1/spider1_better.mjs:5-32
export function spider(url, cb) {
  const filename = urlToFilename(url)
  exists(filename, (err, alreadyExists) => {
    if (err) {
      return cb(err)
    }
    if (alreadyExists) {
      return cb(null, filename, false)
    }
    download(url, filename, err => {
      if (err) {
        return cb(err)
      }
      cb(null, filename, true)
    })
  })
}

const download = (url , filename , cb) => {
  console.log(`Downloading ${url} into ${filename}`)
  get(url, (err, content) =>{
    if(err) return cb(err); 
    saveFile(filename , content , (err) => {
      if(err) return cb(err);
      cb(null , content)
    } )
  })
}
```

- **메커니즘**: `return cb(err)`는 "에러면 즉시 종료, 아니면 다음 줄로"라는 가드절(guard clause) 패턴이다. 이 패턴을 일관되게 쓰면 `else` 블록이 사라지고 각 콜백 레벨의 들여쓰기가 한 단계로 고정된다.
- **트레이드오프**: 함수를 잘게 쪼갤수록 가독성은 좋아지지만, 콜백 체인이 여러 파일/함수로 흩어지면 실행 순서를 눈으로 추적하기 어려워진다는 반대급부가 있다 — 이후 `spider2`~`spider4`에서 `download`/`saveFile`을 계속 재사용하는 이유이기도 하다.
- **흔한 실수**: `if(err) return cb(err)` 뒤에 실수로 `else`를 또 쓰면 가드절의 이점이 사라진다. 또한 `cb(err)` 호출 후 함수가 계속 실행되면 콜백이 두 번 불릴 위험이 있다(뒤에서 다룰 `done`/`finish` 패턴의 핵심 동기).

### 순차 실행 패턴 — `iterate(index)` 재귀 헬퍼
`webspider/spider2`는 `maxDepth`까지 페이지의 링크를 **하나씩 순서대로** 재귀 크롤링한다. 여기서 핵심은 배열을 순회하되 각 원소가 비동기이므로 `for`/`forEach`를 못 쓰고, 콜백 안에서 다음 인덱스를 호출하는 **재귀 이터레이터** 패턴을 쓴다는 점이다.

```js
// chapters/chapter4_asyncCallback/webspider/spider2/spider2.mjs:68-89
function spiderLinks(currentUrl, body, maxDepth, cb) {
    if (maxDepth === 0) { // 1
      return process.nextTick(cb)
    }
    const links = getPageLinks(currentUrl, body) // 2
    if (links.length === 0) {
      return process.nextTick(cb)
    }
    function iterate(index) { // 3
      if (index === links.length) {
        return cb() //cb(null)과 동일. 
      }
      spider(links[index], maxDepth - 1, err => { // 4
        if (err) {
          return cb(err)
        }
        iterate(index + 1) //spider(link[index])가 종료 된 후에 !! 다음 내용 실행 -> 순서 보장

      })
    }
    iterate(0) // 5
}
```

이 패턴의 최소 버전은 `webspider/spider2/iterator.js`에 순수 예제로도 정리되어 있다.

```js
// chapters/chapter4_asyncCallback/webspider/spider2/iterator.js:16-27
function iterate(index) {
    if (index === tasks.length) {
      return finish()
    }
    const task = tasks[index]
    task(() => iterate(index + 1))
  }
```

- **메커니즘**: `iterate(index)`가 `tasks[index]`를 실행하고, 그 콜백 안에서만 `iterate(index+1)`을 호출한다. 즉 **다음 작업은 이전 작업의 콜백이 불려야만 시작**된다 — 이것이 콜백 세계에서 "순차성"을 보장하는 유일한 방법이다(`for`문 안에서 비동기 호출을 하면 순서를 보장 못 함).
- **`process.nextTick(cb)`를 왜 쓰는가**: `links.length === 0`이거나 `maxDepth === 0`이면 콜백을 동기적으로 즉시 부를 수도 있지만, 그러면 이 함수는 "어떨 때는 동기, 어떨 때는 비동기"로 동작하는 **Zalgo**(3장에서 다룬 개념, 코드 주석 `// Remember Zalgo from Chapter 3?`에도 등장)가 된다. `process.nextTick`으로 강제로 다음 틱까지 미뤄서 **항상 비동기**로 동작을 통일시킨다.
- **언제 쓰는지/트레이드오프**: 링크 순서가 중요하거나(같은 서버에 대한 동시 요청 폭주를 피하고 싶을 때), 메모리 사용량을 낮게 유지하고 싶을 때 적합하다. 반면 I/O가 직렬화되므로 페이지 수가 많을수록 전체 소요 시간이 선형으로 늘어난다는 게 단점 — 이게 바로 `spider3`가 병렬화를 시도하는 동기다.

### 병렬 실행과 경쟁 상태 — `spider3.mjs` → `spider3NoRace.mjs`
`spider3.mjs`는 각 링크에 대해 `spider()`를 **동시에** 호출하고, 완료 카운터로 전체 완료를 판단한다.

```js
// chapters/chapter4_asyncCallback/webspider/spider3/spider3.mjs:47-62
  let completed = 0
  let hasErrors = false

  function done(err) {
    if (err) {
      hasErrors = true
      return cb(err)
    }
    if (++completed === links.length && !hasErrors) {
      return cb() //done 함수의 콜백이 상위함수인 .spidercli에서 준 downloadcomplete 출력 
    }
  }

  for (const link of links) {
    spider(link, maxDepth - 1, done)
  }
```

이 버전은 겉보기엔 잘 작동하지만 **경쟁 상태**를 안고 있다. A 페이지와 B 페이지가 둘 다 같은 C 페이지로 링크되어 있으면, A→C 크롤링과 B→C 크롤링이 동시에 시작되어 같은 URL을 중복 다운로드하거나(불필요한 네트워크/디스크 낭비), 최악의 경우 같은 파일에 동시에 쓰기(`writeFile`)가 겹쳐 파일이 깨질 수 있다. `spider3NoRace.mjs`는 **이미 처리 중인 URL 집합**을 전역 `Set`으로 추적해 이를 막는다.

```js
// chapters/chapter4_asyncCallback/webspider/spider3/spider3NoRace.mjs:64-70
const spidering = new Set()

export function spider(url, maxDepth, cb) {
  if (spidering.has(url)) {
    return process.nextTick(cb)
  }
  spidering.add(url)
  ...
```

`spider3/concurrent.js`와 `limitConcurrency.js`는 이 문제를 병렬 실행 자체와 분리해 최소 예제로 보여준다.

```js
// chapters/chapter4_asyncCallback/webspider/spider3/concurrent.js:18-25
  let completed = 0
  for (const task of tasks) {
    task(() => {
      if (++completed === tasks.length) {
        finish()
      }
    })
  }
```

- **메커니즘**: `for` 루프가 모든 작업을 즉시(동기적으로) 시작시키므로, 각 작업은 I/O 완료 시점에 따라 임의 순서로 끝난다. `completed` 카운터는 "몇 개가 끝났는지"만 세고 "몇 번째가 끝났는지"는 신경 쓰지 않기 때문에 이 자체는 안전하지만, 클로저로 공유되는 `completed`/`hasErrors` 같은 상태를 여러 콜백이 동시에 건드리므로 **상태 접근 순서에 대한 가정이 깨지면 바로 버그**가 된다(예: 에러가 나도 `cb(err)`를 여러 번 호출하는 문제 — `hasErrors` 체크가 있어도 `done`이 이미 `cb(err)`를 한 번 부른 뒤 또 다른 실패가 들어오면 `cb`가 두 번 호출된다. 실제로 `spider3.mjs`의 `done`은 이 이중 호출 버그를 안고 있다).
- **언제 쓰는지**: 각 작업이 독립적이고(공유 자원을 안 건드리고), 동시 실행 수에 제약이 없어도 되는 상황(예: 로컬 파일 여러 개를 동시에 읽기)에는 적합하고 빠르다.
- **트레이드오프/흔한 실수**: (1) 무제한 병렬은 수백~수천 개의 동시 네트워크 연결/파일 디스크립터를 열어 시스템 자원을 고갈시킬 수 있다. (2) 콜백이 두 번 이상 불릴 수 있는 경로(에러 후에도 계속 실행)를 반드시 막아야 한다. (3) 재귀적으로 같은 리소스를 다시 방문하는 경우(웹 크롤러의 순환 링크) 별도의 "방문 완료/방문 중" 추적이 필요하다 — `spidering` Set이 그 해법.

### 제한된 병렬 실행 — `limitConcurrency.js`와 `TaskQueue`
`limitConcurrency.js`는 `concurrency` 상한을 두고 `running`/`nextTaskIndex`로 슬롯을 관리하는 최소 구현이다.

```js
// chapters/chapter4_asyncCallback/webspider/spider3/limitConcurrency.js:21-38
const concurrency = 2
let running = 0
let completed = 0
let nextTaskIndex = 0

function next() {
  while (running < concurrency && nextTaskIndex < tasks.length) {
    const task = tasks[nextTaskIndex++]
    task(() => {
      if (++completed === tasks.length) {
        return finish()
      }
      running--
      next()
    })
    running++
  }
}
next()
```

- **메커니즘**: `while (running < concurrency && ...)`가 "동시에 도는 작업 수가 상한보다 적은 동안 새 작업을 계속 밀어넣는" 슬라이딩 윈도우다. 작업 하나가 끝날 때마다 콜백 안에서 `running--` 후 `next()`를 다시 불러 빈 슬롯을 채운다 — 이 재귀적 자기 호출이 큐를 계속 흘러가게 하는 엔진이다.
- **`running++`을 `task()` 호출 직후에 두는 이유**(주석에 명시): 비동기 작업을 막 시작한 시점에 바로 "실행 중"으로 카운트해야, 같은 `while` 루프 안에서 다음 작업을 시작하기 전에 상한을 정확히 체크할 수 있다.

이 아이디어를 재사용 가능한 클래스로 승격한 것이 `QueueLimit/TaskQueue.js`다.

```js
// chapters/chapter4_asyncCallback/webspider/spider3/QueueLimit/TaskQueue.js:1-23
export class TaskQueue {
  constructor(concurrency) {
    this.concurrency = concurrency
    this.running = 0
    this.queue = []
  }

  pushTask(task) {
    this.queue.push(task)
    process.nextTick(this.next.bind(this))
    return this
  }

  next() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()
      task(() => {
        this.running--
        process.nextTick(this.next.bind(this))
      })
      this.running++
    }
  }
  ...
```

- `pushTask`가 **즉시 실행하지 않고** `process.nextTick`으로 `next()`를 예약하는 이유는, `pushTask`를 연속으로 여러 번 호출(`queue.pushTask(a).pushTask(b)`처럼 메서드 체이닝)해도 큐에 다 쌓인 다음에 스케줄링이 시작되도록 하기 위함이다 — 동기 코드 블록이 끝날 때까지 실행을 미루는 전형적인 "매크로/마이크로태스크 지연" 기법.
- `pushTask`가 `this`를 반환해 **메서드 체이닝**(`queue.pushTask(t1).pushTask(t2)`)을 가능하게 한 것도 눈여겨볼 설계.
- `QueueLimit/TaskQueueV2.js`는 여기에 `EventEmitter`를 상속시켜 `'error'`/`'empty'` 이벤트를 추가한 버전이다.

```js
// chapters/chapter4_asyncCallback/webspider/spider3/QueueLimit/TaskQueueV2.js:17-35
    next() {
      if( this.running === 0 && this.queue.length === 0){
        return this.emit('empty'); 
      }
      while (
        this.running < this.concurrency &&
        this.queue.length > 0
      ) {
        const task = this.queue.shift()
        task((err) => {
            if(err){
                this.emit('error'); 
            }
          this.running--
          process.nextTick(this.next.bind(this))
        })
        this.running++
      }
    }
```

- `spiderQueue.mjs`/`spiderQueueV2.mjs`는 이 `TaskQueue`를 **일반 작업 스케줄러**로 시연하는 예제로, "작업 안에서 새 작업을 큐에 추가하는" 중첩 패턴(`task1`이 실행되며 `subtask 1`, `subtask 2`를 다시 `pushTask`)을 보여준다 — 이는 뒤이어 `spider4`가 재귀 크롤링 자체를 큐 기반으로 재구성하는 데의 준비 단계다.
- **트레이드오프**: 동시성 상한을 너무 낮게 두면 처리량이 떨어지고, 너무 높게 두면 무제한 병렬과 다를 바 없어진다. 실무에서는 대상 서버의 rate limit, 로컬 파일 디스크립터 한도(ulimit) 등을 감안해 값을 정한다.

### 완성형 — spider4: 재귀 호출 자체를 큐에 위임
`spider3`까지는 "링크 목록을 병렬로 순회"하는 데에만 큐를 썼다면, `spider4`는 **재귀 크롤링 호출 자체를 하나의 태스크로 큐에 넣는다** — `spiderLinks`가 하위 링크마다 즉시 `spider()`를 부르고, `spider()`는 실제 작업을 실행하는 대신 큐에 태스크를 등록만 하고 즉시 반환한다.

```js
// chapters/chapter4_asyncCallback/webspider/spider4/spider4.mjs:100-110
const spidering = new Set() //prevent race conditions. 

export function spider(url, maxDepth, queue) {
  if (spidering.has(url)) {
    return
  }
  spidering.add(url)

  queue.pushTask(done => {
    spiderTask(url, maxDepth, queue, done)
  })
}
```

```js
// chapters/chapter4_asyncCallback/webspider/spider4/spider4.mjs:35-49
function spiderLinks(currentUrl, body, maxDepth, queue) {
  if (maxDepth === 0) {
    return
  }
  const links = getPageLinks(currentUrl, body)
  if (links.length === 0) {
    return
  }
  for (const link of links) {
    spider(link, maxDepth - 1, queue) //각 link들에 지체없이 바로 spider 호출 -> queue.pushTask 바로 실행
    //해당 링크를 크롤링하는 새로운 spiderTask를 태스크 큐에 추가 
  }
}
```

- **메커니즘**: 이제 재귀는 "함수 호출 스택의 재귀"가 아니라 "큐에 계속 태스크를 밀어넣는 재귀"로 바뀐다. `spiderTask`가 페이지를 다운로드/파싱한 뒤 `spiderLinks`를 호출해 새 하위 URL들을 다시 `queue.pushTask`로 등록하고, 그 자신의 완료는 `cb()`(=`done`)로 큐에 알린다. 크롤링 전체의 동시성은 오직 `TaskQueue`의 `concurrency` 하나로 통제된다 — 사이트 전체를 몇 단계 깊이든 상관없이 **일정한 동시 다운로드 수**로 순회할 수 있게 된 것이 이 버전의 핵심 이득.
- `spidering` Set은 `spider3NoRace`와 동일한 역할(중복 방문 방지)을 여기서도 그대로 재사용한다.
- `spider4/TaskQueue.js`는 `QueueLimit/TaskQueueV2.js`와 사실상 동일한 `EventEmitter` 기반 큐이며, `spider4-cli.js`가 `concurrency`를 CLI 인자로 받아 큐를 생성하고 `'error'`/`'empty'` 이벤트로 진행 상황을 관찰한다.

```js
// chapters/chapter4_asyncCallback/webspider/spider4/spider4-cli.js:1-11
import { TaskQueue } from './TaskQueue.js'
import { spider } from './spider4.mjs'

const url = process.argv[2]
const maxDepth = Number.parseInt(process.argv[3], 10) || 1
const concurrency = Number.parseInt(process.argv[4], 10) || 2

const spiderQueue = new TaskQueue(concurrency)
spiderQueue.on('error', console.error)
spiderQueue.on('empty', () => console.log('Download complete'))

spider(url, maxDepth, spiderQueue)
```

- **언제 쓰는지**: 크롤링처럼 트리/그래프 구조를 어느 깊이까지 뻗어나갈지 미리 알 수 없고, 각 단계에서 새 작업이 계속 발견되는 상황에 적합한 패턴 — "작업 큐에 작업이 새 작업을 추가하는" 자기 증식형 워크로드의 표준 해법이다.
- **`webspider/`의 공통 유틸리티**: `utils.js`(각 spider 버전마다 거의 동일하게 복제됨)는 `exists`(파일 존재 확인), `urlToFilename`(URL→로컬 경로 슬러그화), `get`(fetch를 콜백 스타일로 감쌈 — 책이 콜백 패턴을 가르치기 위한 의도적 래핑이라고 주석에 명시), `recursiveMkdir`(mkdirp 콜백 래핑), `getPageLinks`(`htmlparser2`의 `Parser`로 같은 도메인의 `<a href>`만 추출)로 구성된다. `get`과 `recursiveMkdir`의 NOTE 주석 — "일부러 콜백으로 감쌌다"는 — 은 이 챕터가 실전 라이브러리보다 **패턴 학습 자체**를 목적으로 설계됐음을 보여준다.

### 연습문제: fileConcatenation01 — rest parameter와 마지막-인자 콜백 관례의 충돌
`concatFiles(...args)`는 "콜백은 항상 마지막 인자"라는 Node 관례와 "가변 인자(rest parameter)도 마지막에 와야 한다"는 문법 제약이 충돌하는 문제를 다룬다.

```js
// chapters/chapter4_asyncCallback/exercise/fileConcatenation01/concatenation.mjs:6-38
function concatFiles(...args){ 
    const cb = args.pop(); 
    const dest = args.pop(); 
    const srcs = args ;
    
    let fileData = ''; 

    function iterator(index){
        if(index === srcs.length ){
            writeFile(dest , fileData , (err) => {
                if(err){
                    return cb(err); 
                } 
                cb(); 
              
            })
            return; 
        }
        readFile(srcs[index] , (err , data) => {
            if(err) {            
                return cb(err); 
            }
            fileData+=data.toString();
            iterator(index+1);
    })
    }
    iterator(0);        
}
```

- **해법**: 모든 인자를 `...args`로 rest parameter에 몰아 받은 뒤, 함수 **내부에서 `pop()`으로 뒤에서부터 꺼낸다**(`cb` → `dest` → 나머지는 `srcs`). 순서 의존적이라는 단점은 있지만 가변 개수의 소스 파일을 지원하면서도 콜백/목적지를 마지막에 둘 수 있다.
- **흔한 실수**(코드 내 주석에도 명시): 호출부에서 `concatFiles(args)`처럼 배열을 그대로 넘기면 `...args`가 그 배열 하나를 감싸 2차원 배열이 되어버린다 — 반드시 `concatFiles(...args)`로 스프레드해서 호출해야 한다.
- 이 예제는 `spider2`의 `iterate(index)` 순차 패턴을 파일 읽기에 그대로 적용한 것이기도 하다 — 여러 `readFile` 결과를 순서대로(입력 순서 보장) 이어 붙여야 하므로 병렬이 아니라 순차 실행이 맞는 선택이다.

### 연습문제: listFileRecursively02 — "몇 개 남았는지" 세는 함정과 이중 콜백 방지
같은 디렉터리 재귀 탐색 문제를 세 버전에 걸쳐 다듬는 과정이 그대로 남아 있어, **완료 카운팅의 버그가 어떻게 발전적으로 고쳐지는지** 보기에 가장 좋은 자료다.

`listNested.mjs`(V1)는 `for...of` 루프 안에서 `taskDone === taskLength`를 매 반복마다 체크하는데, 이는 **파일 배열의 순서(인덱스)를 "완료된 비동기 작업 수"로 착각**하는 전형적 버그다(하위 디렉터리 재귀 호출은 비동기인데, 그 결과를 기다리지 않고 다음 반복으로 넘어가 버린다).

`listNestedV2.mjs`는 `pending` 카운터를 두고 콜백 완료 시점에만 감소시키도록 고치지만, **디렉터리를 만났을 때 재귀 `walk`의 완료 콜백 안에서만 `pending--`을 하는 반면, 파일을 만났을 때는 즉시(동기적으로) `pending--`을 해버려** 두 갈래의 타이밍이 뒤섞인다.

`listNestedV3.mjs`가 최종적으로 안전한 버전이다.

```js
// chapters/chapter4_asyncCallback/exercise/listFileRecursively02/listNestedV3.mjs:4-45
function listNestedFiles(dir, cb) {
  const results = [];
  let pending = 0;
  let done = false;

  //race condition 시 발생 가능한 "에러가 두번 발생하는 경우" 를 방지하고자 ! 
  function finish(err) {
    if (done) return;
    done = true;
    cb(err, results);
  }

  function visit(currentPath) {
    pending++; // new asynchronous work added ! 

    readdir(currentPath, { withFileTypes: true }, (err, entries) => {
      if (err) return finish(err);

      entries.forEach(entry => {
        const fullPath = join(currentPath, entry.name);
        if (entry.isDirectory()) {
          visit(fullPath);
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      });

      pending--; //현재 비동기 작업 종료 
      if (pending === 0) {
        finish(null);
      }
    });
  }

  visit(dir);
}
```

- **메커니즘**: `visit()`을 호출하는 즉시(`readdir` 시작 전) `pending++`을 해서 "지금 진행 중인 비동기 작업이 1개 늘었다"를 먼저 기록하고, 그 `readdir` 콜백이 돌아왔을 때만 `pending--`을 한다. 하위 디렉터리를 발견하면 `visit(fullPath)`를 재귀 호출해 `pending`을 또 늘리므로, **트리 전체에 걸쳐 미해결 비동기 작업 수를 정확히 추적**할 수 있다. `pending === 0`이 되는 순간 = 모든 가지의 `readdir`이 끝난 순간 = 진짜 완료 시점.
- **`finish`의 `done` 플래그**: 여러 갈래에서 동시에 에러가 나거나, 혹은(이론상) `finish`가 두 경로에서 호출될 수 있는 여지가 있을 때 **cb가 두 번 불리는 것을 막는 가드**다. 코드 내 한국어 주석이 시나리오를 정확히 설명한다 — "A, B가 둘 다 잘못된 경로로 readdir 실행 → A가 먼저 finish(err) → done=true → B도 실패해서 finish 호출되지만 done이 true라 무시됨." 이 "완료 플래그로 콜백 단일 호출을 보장"하는 패턴은 이 챕터 전체(뒤의 `recursiveFind03`, `TaskQueue`의 `'error'` 이벤트 처리)에서 반복해서 등장하는 핵심 관용구다.
- **흔한 실수 정리**: (1) 동기 루프의 인덱스 진행을 비동기 완료와 동일시하지 말 것, (2) "카운터 증가"와 "카운터 감소"는 반드시 대칭적인 시점(비동기 작업 시작 직후 / 완료 콜백 안)에 있어야 함, (3) 콜백이 여러 경로로 여러 번 불릴 가능성이 있으면 `done` 플래그로 반드시 막을 것.

### 연습문제: recursiveFind03 — 제한된 병렬 탐색 + 에러 처리 방식의 차이
디렉터리를 재귀적으로 훑으며 키워드가 포함된 파일을 찾는 문제로, `idea.md`의 설계 스케치(`readdir` → `isDirectory`/`isFile` 분기 → `readFile`로 키워드 검사)에서 출발해 두 버전으로 구현된다. `recursive.mjs`(V1, `readdir`+`taskLen` 카운터만 사용, 서브디렉터리 재귀 없음 — TODO성 초안)를 거쳐, `recursiveV2.mjs`/`recursiveV3.mjs`가 `webspider/spider3/limitConcurrency.js`의 **제한된 병렬 큐 패턴을 그대로 재사용**해 디렉터리 트리를 순회한다.

```js
// chapters/chapter4_asyncCallback/exercise/recursiveFind03/recursiveV2.mjs:4-21
function recursiveFind(dir , keyword , cb){
    const concurrency = 2; 
    const tasks = [dir]; 
    const results = []; 
    let running = 0 ; 
    
    function next(){
        if(tasks.length === 0 && running === 0 ){
            return cb(null , results); 
        }
        //실행 중 작업이 제한보다작고 , 할 일이 남아있을 떄 
        while(running < concurrency && tasks.length > 0 ){
            const task = tasks.shift(); 
            processPath(task); 
        }
    }
    ...
```

- **메커니즘**: `tasks` 배열은 "아직 처리 안 한 경로들"의 큐다. 파일이면 `stat` → `readFile`로 키워드 검사, 디렉터리면 `stat` → `readdir`로 그 안의 항목들을 다시 `tasks`에 push해 큐를 계속 불린다. `limitConcurrency.js`와 동일하게 `running < concurrency`인 동안만 새 작업을 꺼내 실행한다. 이는 파일시스템 트리라는 **가변 깊이의 재귀 구조**에 제한된 병렬 큐를 적용한 예로, `spider4`가 웹 링크 그래프에 적용한 것과 본질적으로 같은 패턴이다.
- **V2 → V3의 차이 — 에러 처리와 완료 보장**: V2는 `cb(err)`를 여러 경로(예: `stat` 에러, 인위적 에러 주입 지점)에서 직접 호출하며, 이 경우 `running--`이나 `next()`가 실행되지 않아 **에러 발생 후에도 이미 진행 중이던 다른 비동기 작업들이 나중에 완료되면서 `cb`를 다시 호출하려 시도할 위험**이 있다(콜백 중복 호출 가능성). `recursiveV3.mjs`는 `listNestedV3.mjs`와 동일한 `done`/`finish` 가드를 도입해 이를 근본적으로 막는다.

```js
// chapters/chapter4_asyncCallback/exercise/recursiveFind03/recursiveV3.mjs:10-17
  let running = 0;
  let done = false;

  // 최종 콜백은 한 번만 호출되도록 래핑
  const finish = (err) => {
    if (done) return;
    done = true;
    cb(err, results); 
  };
```

- V3는 또한 `stat`/`readdir`/`readFile` 각 실패 지점에서 모두 `finish(err)`로 통일해 호출하고, 정상 완료 시에도 `next()`가 `finish(null)`을 부르도록 일관되게 정리했다 — "에러든 성공이든 종료는 반드시 finish 한 곳을 거친다"는 **단일 종료 지점(single exit point)** 원칙을 코드로 구현한 사례.
- V2/V3 모두 테스트를 위해 `path.endsWith('test1.txt')`일 때 의도적으로 에러를 주입하는 코드가 들어있는데(V3는 주석 처리됨), 이는 저자가 "에러 경로가 실제로 안전하게 처리되는지"를 직접 검증해본 흔적이다.

### 연습문제: BrokenLinkCheck04 — 미완성 상태로 남은 문제
`idea.md`는 웹 스파이더를 변형해 각 링크의 HTTP 상태 코드(특히 404)를 검사하는 `checkBrokenLinks(url, depth)` 함수를 요구하며, GET 대신 **HEAD 메서드**를 써서 응답 바디를 받지 않고 헤더만 확인해 대역폭을 아끼라는 힌트를 준다. 실제 구현 파일 `brokenLink.mjs`는 `./spider.mjs`에서 `spider`를 임포트해 실행하는 CLI 스텁만 있고, **정작 `spider.mjs` 구현 파일 자체가 폴더에 존재하지 않는다** — 즉 이 연습문제는 설계만 되어 있고 구현이 아직 끝나지 않은 상태다. 다시 이 챕터로 돌아올 때 이 문제부터 이어서 구현하면 좋다(예: `spider4`의 큐 기반 구조를 골격으로 삼아 `get`을 `HEAD` 요청으로 바꾸고 200번대가 아닌 응답을 로그로 남기는 방식).

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가
- 콜백 기반(또는 프로미스라도 내부적으로 유사한) 비동기 루프를 짤 때 **"완료 카운터는 반드시 비동기 작업 시작 직후 증가, 완료 콜백 안에서만 감소"** 원칙을 지키고 있는지 헷갈리면 `listFileRecursively02`의 V1→V3 진화, `recursiveFind03`의 V2→V3를 다시 보라.
- 콜백이 여러 경로(성공/에러/재귀 하위 경로)에서 두 번 이상 불릴 수 있는 함수를 작성 중이라면 `done`/`finish` 가드 패턴(`if (done) return; done = true;`)을 이 노트의 `listNestedV3.mjs`, `recursiveV3.mjs`, `TaskQueue`의 `'error'` 이벤트 처리에서 다시 확인.
- "순차 vs 무제한 병렬 vs 제한된 병렬" 중 어떤 걸 골라야 할지 판단이 안 설 때: 순서 보장이 필요하면 `iterate(index)`(spider2), 독립적이고 자원 제약이 없으면 무제한 병렬(spider3/concurrent.js), 동시 연결/파일 핸들 수를 통제해야 하면 `TaskQueue`(spider3/QueueLimit, spider4) — 이 노트의 해당 절로 바로 이동.
- 재귀 구조(디렉터리 트리, 웹 링크 그래프)를 콜백으로 순회하며 **같은 노드를 중복 방문하지 않도록** 해야 할 때 `spidering = new Set()` 패턴(spider3NoRace, spider4)을 재사용.
- 큐에 작업이 새 작업을 계속 추가하는 "자기 증식형" 워크로드(크롤러, 파일 트리 탐색)를 설계할 때 `spider4`의 "재귀 호출을 태스크로 큐에 위임" 구조를 템플릿으로 참고.
- `chapter4_asyncCallback/exercise/BrokenLinkCheck04`는 `spider.mjs`가 없어 미완성이므로, 이 챕터를 복습하며 마무리 실습을 하고 싶을 때 우선순위로 삼을 것.
