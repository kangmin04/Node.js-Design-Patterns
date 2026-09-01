# Chapter 11 — 비동기 레시피

## 개요

이 챕터는 "Node.js Design Patterns" 책의 11장(비동기 레시피, Recipes)을 실습한 결과물로, 실무에서 반복적으로 마주치는 4가지 비동기 문제 — **비동기 초기화**, **배치 처리와 캐싱**, **취소 가능한 비동기 작업**, **CPU 바운드 작업 오프로딩** — 에 대한 구체적인 해법을 다룬다. 공통된 배경은 Node.js가 **싱글 스레드 이벤트 루프**로 동작한다는 제약이다: 동기 API를 잘못 쓰면 서버 전체가 멈추고, 비동기 작업이라도 관리하지 않으면 중복 호출·취소 불가·리소스 낭비 문제가 생긴다. 각 폴더는 "문제가 있는 최초 버전 → 개선된 버전"의 흐름으로 구성되어 있어, 왜 그 패턴이 필요한지 대조하며 학습할 수 있다. `exercise/` 폴더에는 각 레시피를 응용한 자체 연습 문제(제너레이터 기반 취소, 컴퓨트 팜, 콜백 버전 배치/캐싱, Proxy 기반 초기화 큐)가 포함되어 있다.

### 개념 1: 비동기 초기화 (Asynchronous Initialization)

**문제 상황.** DB 커넥션처럼 비동기로 초기화되는 리소스를 아직 연결되지 않은 상태에서 사용하면 에러가 난다.

```js
// chapters/chapter11_recipe/01-asynchronous-init/01-db/db.mjs:1-28
import {setTimeout} from 'node:timers/promises';

class Database {
    connected = false;
    #pendingConnection = null;

    async connect(){
        if(!this.connected){
            if(this.#pendingConnection){
                return this.#pendingConnection;
            }
            this.#pendingConnection = setTimeout(500);
            await this.#pendingConnection;
            this.connected = true;
            this.#pendingConnection = null;
        }
    }

    async query(queryString){
        if(!this.connected){
            throw new Error('Not connected yet')
        }
        await setTimeout(100);
        console.log(`Query executed: ${queryString}`)
    }
}

export const db = new Database()
```

여기서 `#pendingConnection`(private 필드)이 핵심이다. `connect()`가 동시에 여러 번 호출돼도, 이미 진행 중인 연결 **프로미스 자체를 캐싱**해서 재사용하므로 중복 연결이 일어나지 않는다. 이것이 "**싱글톤 프로미스(Singleton Promise) 패턴**"이며, `01-asynchronous-init/study.txt`에서는 이를 "연결 완료 여부를 boolean으로 저장하는 게 아니라, 연결 중인 프로미스 자체를 변수에 캐싱한다"고 설명한다. boolean 플래그만 쓰면 서버 기동 직후 100개의 요청이 동시에 들어올 때 `isConnected`가 아직 `false`인 그 짧은 틈에 100번 모두 연결을 시도해버리는 레이스 컨디션이 생기기 때문이다.

**해결책 1 — Lazy check(호출부에서 확인 후 대기).**

```js
// chapters/chapter11_recipe/01-asynchronous-init/01-db/local-init-check.mjs:1-8
import { db } from "./db.mjs";

async function getUsers(){
    if(!db.connected){
        await db.connect();
    }
    await db.query(`SELECT * FROM users`)
}
```

`if` 없이 매번 `await db.connect()`를 호출해도 동작은 같다(멱등성). 그런데도 `if`를 쓰는 이유는 **성능 최적화** 때문이다. `await`를 만나면 함수는 무조건 한 번 이벤트 루프에 제어권을 넘기고 마이크로태스크 큐를 거쳐야 하므로, 이미 연결된 상태라면 `if`로 우회해 불필요한 비동기 왕복을 생략할 수 있다.

**해결책 2 — Delayed startup(사전 부트스트랩).**

```js
// chapters/chapter11_recipe/01-asynchronous-init/01-db/delayed-start.mjs:1-11
import { db } from "./db.mjs";

async function getConnectedDb(){
    await db.connect();
    return db;
}
async function getUsers(db){
    await db.query(`SELECT * FROM users`)
}
const connectedDb = await getConnectedDb();
await getUsers(connectedDb)
```

애플리케이션이 시작하자마자 필요한 모든 비동기 리소스를 `Promise.all`로 한꺼번에 연결한 뒤에 서버를 띄우는 방식. 장점은 런타임 중 "아직 연결 안 됨" 에러를 걱정할 필요가 없다는 것이지만, 단점은 (a) 부팅 시간이 늘어나고 (b) 당장 쓰지 않는 리소스까지 초기화해 낭비가 생기며 (c) 중간에 연결이 끊기는 상황은 별도로 처리해야 한다는 점이다.

**02-db-init-queue — 요청을 큐에 쌓았다가 연결 완료 후 일괄 실행.**

```js
// chapters/chapter11_recipe/01-asynchronous-init/02-db-init-queue/db.mjs:1-40
class Database {
    connected = false;
    #pendingConnection = null;
    commandsQueue = [];

    async connect(){
        if(!this.connected){
            if(this.#pendingConnection){ return this.#pendingConnection; }
            this.#pendingConnection = setTimeout(500);
            await this.#pendingConnection;
            this.connected = true;
            this.#pendingConnection = null;

            while(this.commandsQueue.length > 0){
                const command = this.commandsQueue.shift();
                command();
            }
        }
    }

    async query(queryString){
        if(!this.connected){
            return new Promise((resolve, reject) => {
                const command = () => {
                    this.query(queryString).then(resolve, reject)
                }
                this.commandsQueue.push(command);
            })
        }
        await setTimeout(100);
        console.log(`Query executed: ${queryString}`)
    }
}
```

연결 전에 `query()`가 호출되면 즉시 실패시키지 않고, "**나중에 실행할 함수(command)**"를 큐에 넣은 새 프로미스를 반환한다. `connect()`가 끝나면 큐를 순회하며 각 command를 실행하는데, 이 command는 다시 `query()`를 호출하고(이번엔 `connected === true`이므로 정상 통과) 바깥의 `resolve`/`reject`로 결과를 흘려보낸다. 즉 **소비자는 연결 여부를 신경 쓰지 않고 그냥 `query()`를 호출할 수 있다** — provider(라이브러리) 쪽이 이 복잡성을 흡수한 것.

**03-db-state — State 패턴으로 동일한 구조를 더 명확하게 표현.**

```js
// chapters/chapter11_recipe/01-asynchronous-init/03-db-state/state.mjs:23-50
const deactivate = Symbol('deactivate');

export class QueuingState extends stub {
    constructor(db){ super(); this.db = db; this.commandsQueue = []; }

    async query(queryString){
        return new Promise((resolve, reject) => {
            const command = () => {
                this.db.query(queryString).then(resolve, reject)
            }
            this.commandsQueue.push(command);
        })
    }

    [deactivate](){
        while(this.commandsQueue.length > 0){
            const command = this.commandsQueue.shift();
            command();
        }
    }
}
```

`Database`는 `this.state`에 현재 상태 객체(`QueuingState` 또는 `InitializedState`)를 들고 있다가 `query()` 호출을 그대로 위임한다. 연결이 완료되면 `oldState[deactivate]?.()`를 호출해 큐에 쌓인 요청을 전부 흘려보내고 상태를 `InitializedState`로 교체한다. 여기서 `Symbol('deactivate')`를 메서드 키로 쓴 것이 포인트 — **공개 API가 아닌 내부 전용 메서드**임을 이름 충돌 없이 표현하는 방법이다. 02번(큐를 직접 다루는 방식)과 03번(state 객체로 캡슐화)은 결과는 같지만, 상태가 늘어날수록(예: `Reconnecting`, `Error` 등) State 패턴 쪽이 `if/else` 누적 없이 확장하기 쉽다.

**실무 확장 — Eager / Lazy / Warm-up.** `01-asynchronous-init/study.txt`에 정리된 실무 판단 기준:

- **Eager init(사전 로드)**: 자주 안 바뀌는 참조 데이터, 레이턴시에 극도로 민감한 서비스(금융), 쿠버네티스 Readiness Probe와 잘 맞는 환경.
- **Lazy init**: 트래픽 변동이 커서 빠른 스케일 아웃이 필요한 서비스, 서버리스(요청이 와야 함수가 뜨는 구조라 사실상 Lazy가 강제됨), 핵심 기능이 아닌 부가 API.
- **Warm-up(절충안)**: 싱글톤 프로미스로 동시성을 제어하면서(`initPromise` 캐싱), `app.listen()` 콜백 안에서 `await` 없이 `apiService.connect()`를 미리 트리거해 첫 유저의 콜드 스타트를 줄이거나, `/health`·`/ready` 엔드포인트로 외부 인프라(K8s 등)가 준비 완료를 감지하게 한다.

### 개념 2: 배치 처리와 캐싱 (Batching & Caching)

**바닥이 되는 원본 함수 — 매번 전체 스캔.**

```js
// chapters/chapter11_recipe/02-async-batch-caching/totalSales.mjs:10-22
export async function totalSales(product) {
    const now = Date.now()
    let sum = 0;
    for await (const [_transactionId, transcation] of db.iterator()){
        if(!product || transcation.product === product){
            sum += transcation.amount
        }
    }
    console.log(`totalSales() took: ${Date.now() - now}ms`)
    return sum
}
```

LevelDB(`level` 패키지, `populateDb.mjs`로 10만 건의 가짜 매출 레코드 시딩)를 `db.iterator()`(Async Iterable, 내부적으로는 EventEmitter를 상속한 readable stream)로 전량 스캔한다. 조건절이 루프 안에 있어 **필터링 없이 항상 풀스캔**하므로 요청마다 수백ms가 걸린다. 이 비용을 줄이는 것이 이어지는 두 레시피의 목표다.

**Batching(요청 편승, Piggybacking) — 동시에 들어온 동일 요청을 하나로 묶기.**

```js
// chapters/chapter11_recipe/02-async-batch-caching/totalSalesBatch.mjs:1-16
const runningRequests = new Map();
export function totalSales(product){
    if(runningRequests.has(product)){
        return runningRequests.get(product);
    }
    const resultPromise = totalSalesRaw(product);
    runningRequests.set(product, resultPromise);
    resultPromise.finally(() => {
        runningRequests.delete(product)
    })
    return resultPromise;
}
```

핵심은 "**실행 중인 프로미스를 Map에 저장**"하는 것. 같은 `product`로 이미 계산이 진행 중이면 새 작업을 만들지 않고 기존 프로미스를 그대로 반환한다(=결과를 공유해서 "편승"). `finally`로 완료·실패 여부와 무관하게 Map에서 제거해 다음 요청부터는 다시 새 계산이 시작되게 한다. `study.txt`가 지적하는 한계: 작업이 너무 빨리 끝나면 편승할 틈이 없고, 요청 간격이 벌어지면(첫 요청이 이미 끝난 뒤 두 번째가 옴) 배칭 효과가 전혀 없다 — 이 두 경우엔 캐싱이 필요하다.

**Caching — TTL 기반 결과 캐시.**

```js
// chapters/chapter11_recipe/02-async-batch-caching/totalSalesCache.mjs:1-23
const CACHE_TTL = 30 * 1000 //30 seconds
const cache = new Map();

export function totalSales(product){
    if(cache.has(product)){
        return cache.get(product);
    }
    const resultPromise = totalSalesRaw(product);
    cache.set(product, resultPromise);
    resultPromise.then(() => {
        setTimeout(() => { cache.delete(product) }, CACHE_TTL)
    }).catch((err) => {
        cache.delete(product)
        throw err
    })
    return resultPromise;
}
```

`totalSalesBatch.mjs`와 거의 같은 뼈대지만 결정적 차이는 **완료 즉시 Map에서 지우지 않고 TTL만큼 남겨둔다**는 점이다(`finally` 대신 `then`에서 지연 삭제, `catch`에서는 즉시 삭제). 이 덕분에 배칭과 캐싱을 동시에 얻는다 — 계산이 진행 중일 때 들어오는 요청은 진행 중인 프로미스에 편승하고(배칭), 계산이 끝난 뒤 TTL 안에 들어오는 요청은 캐시된 결과를 즉시 받는다(캐싱). `study.txt`는 이를 "cache가 만들어지기 전까진 batching, 이후는 caching"이라고 요약한다.

**LRU 캐시(용량 제한).**

```js
// chapters/chapter11_recipe/02-async-batch-caching/LruCache.mjs:28-53
class LRUCache {
    constructor(capacity) { this.capacity = capacity; this.cache = new Map(); }

    get(key) {
      if (!this.cache.has(key)) return null;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value); // 가장 최근 사용으로 재삽입
      return value;
    }

    put(key, value) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
      } else if (this.cache.size >= this.capacity) {
        const oldestKey = this.cache.keys().next().value; // 가장 오래전 삽입된 키
        this.cache.delete(oldestKey);
      }
      this.cache.set(key, value);
    }
}
```

JS의 `Map`은 **삽입 순서를 보장**하므로, `get`할 때 항목을 지웠다가 다시 넣으면 "가장 최근 사용"으로 순서가 밀리고, `put`에서 용량 초과 시 `keys().next().value`로 맨 앞(가장 오래된) 키를 꺼내 지우면 별도의 이중 연결 리스트 없이도 O(1)에 가까운 LRU를 구현할 수 있다. `totalSalesCache.mjs`의 TTL 캐시가 "시간" 기준 무효화라면, 이 LRU는 "용량" 기준 무효화 — 실무에서는 이 둘을 함께 쓰는 경우가 많다(TTL + 최대 개수 제한).

**서버 연결.** `server.mjs`는 세 가지 버전(`totalSales`/`totalSalesBatch`/`totalSalesCache`)을 import 문 주석 전환만으로 바꿔가며 비교하도록 만들어져 있다 — 같은 HTTP 핸들러 코드에서 어떤 전략을 쓰느냐만 바뀐다는 점이 실무에서 이 패턴을 "레이어"로 분리해 넣기 쉽다는 것을 보여준다.

### 개념 3: 취소 가능한 비동기 작업 (Asynchronous Cancellation)

**핵심 전제.** 한번 시작된 프로미스는 외부에서 강제로 멈출 수 없다. 취소하려면 (1) 외부에서 "취소됨" 신호를 세팅하고 (2) 비동기 작업 내부에서 그 신호를 주기적으로 확인해 스스로 중단해야 한다.

**단계 1 — simple: 평범한 변수 플래그로 취소.**

```js
// chapters/chapter11_recipe/03-asynchronous-cancel/simple/index.mjs:12-27
async function cancelable(cancelObj){
    const resA = await asyncRoutine('A');
    console.log(resA);
    if(cancelObj.cancelRequested){
        throw new CancelError()
    }
    const resB = await asyncRoutine('B');
    // ... 이하 각 단계마다 cancelRequested 체크 반복
}
```

`cancelObj = {cancelRequested: false}`를 외부 `setTimeout`이 `true`로 바꾸고, 함수 내부는 각 `await` 뒤마다 수동으로 체크한다. 동작은 하지만 **체크 코드가 매 단계 반복**되고, 커스텀 `CancelError`(`isCanceled = true` 플래그 포함)를 던져 호출부에서 `err instanceof CancelError`로 구분한다.

**단계 2 — wrapper: 체크 로직을 고차 함수로 추출.**

```js
// chapters/chapter11_recipe/03-asynchronous-cancel/wrapper/wrapper.mjs:1-17
export function createCancelWrapper(){
    let cancelRequested = false;
    function cancel(){ cancelRequested = true; }

    function callIfNotCanceled(func, ...args){
        if(cancelRequested){
            return Promise.reject(new CancelError())
        }
        return func(...args)
    }
    return {cancel, callIfNotCanceled};
}
```

```js
// chapters/chapter11_recipe/03-asynchronous-cancel/wrapper/index.mjs:5-14
async function cancelable(callIfNotCanceled){
    const resA = await callIfNotCanceled(asyncRoutine, 'A')
    console.log(resA);
    const resB =  await callIfNotCanceled(asyncRoutine, 'B')
    // ...
}
```

이제 `if(cancelObj.cancelRequested)`를 매번 손으로 쓰는 대신 `callIfNotCanceled(func, ...args)`라는 래퍼에 위임한다. 취소 상태(`cancelRequested`)는 클로저 안에 캡슐화되어 외부 노출 없이 `cancel()`/`callIfNotCanceled()` 두 개의 함수로만 조작된다 — **관심사 분리**가 한 단계 더 진행된 버전.

**단계 3 — abortController: 표준 API로 대체.**

```js
// chapters/chapter11_recipe/03-asynchronous-cancel/abortController/index.mjs:9-36
async function cancelable(abortSignal){
    abortSignal.throwIfAborted();
    const resA = await asyncRoutine('A');
    console.log(resA);
    abortSignal.throwIfAborted();
    const resB = await asyncRoutine('B');
    // ...
}

const ac = new AbortController()
setTimeout(() => { ac.abort(); }, 100);

try {
    await cancelable(ac.signal);
} catch (err) {
    if(err.name === 'AbortError'){ console.log('Function canceled'); }
    else { console.log(err); }
}
```

`simple`/`wrapper`는 자체 제작한 취소 매커니즘이라 **서드파티 라이브러리와 호환되지 않는다**는 한계가 있다(`study-abortController.txt`에서 지적). Node 표준 `AbortController`/`AbortSignal`을 쓰면 `signal.throwIfAborted()`(또는 `signal.aborted` 체크, `signal.addEventListener('abort', ...)`)로 동일한 일을 하면서, `fetch`·`node:timers/promises`처럼 `signal` 옵션을 지원하는 모든 API와 자연스럽게 조합된다. `abortController/timer.mjs`가 그 예시다.

```js
// chapters/chapter11_recipe/03-asynchronous-cancel/abortController/timer.mjs:12-17
try {
    await setTimeoutPromise(5000, 'done', { signal });
    console.log('대기 완료! (이 메시지는 보이지 않아야 함)');
} catch (err) {
    if (err.name === 'AbortError') { console.log('setTimeoutPromise 작업이 성공적으로 취소되었습니다!'); }
}
```

`wrapperVer.mjs`는 wrapper 단계와 같은 아이디어를 `AbortSignal` 버전으로 재구성해, "취소 체크"와 "결과 로깅"의 책임을 분리한 `throwIfAbortedWrapper(abortSignal, asyncFunc, ...args)`를 제공한다.

**실무 활용(`study-abortController.txt`).**
- **검색 자동완성**: 사용자가 `a → ab → abc`로 빠르게 입력하면 세 번의 요청이 나가는데, 느린 응답이 늦게 와서 화면을 덮어쓰는 버그를 막기 위해 새 요청 직전 `currentController.abort()`로 이전 요청을 취소.
- **네트워크 타임아웃**: `fetch`엔 자체 timeout이 없으므로 `AbortSignal.timeout(ms)`로 구현.
- **대용량 업로드 취소 버튼**: 사용자가 [취소]를 누르면 `controller.abort()`로 진행 중인 axios 요청을 중단(`axios.isCancel(error)`로 판별).

### 개념 4: CPU 바운드 작업 오프로딩 (interleaving / child process / worker threads)

**문제의 근원.** `subsetSum` 문제(주어진 집합의 모든 부분집합을 재귀로 나열하며 합이 목표값과 같은지 확인)처럼 계산량이 큰 동기 코드는 이벤트 루프를 블로킹해 다른 요청을 전혀 처리하지 못하게 만든다(`01-asynchronous-init`와 별개로 챕터 루트 `study.txt`가 "DoS(대량 트래픽으로 서버 장애)" 위험으로 명시).

```js
// chapters/chapter11_recipe/04-cpu-bound-task/interleaving/subsetSum.mjs:11-31
export class SubsetSum extends EventEmitter {
    _combine(set, subset){
        for(let i = 0; i < set.length ; i++){
            const newSubset = [...subset, set[i]]
            this._combine(set.slice(i+1),newSubset)
            this.processSubset(newSubset)
        }
    }
    processSubset(subset){
        const res = subset.reduce((prev, item) => (prev+item), 0)
        if(res === this.sum){ this.emit('match', subset) }
    }
    start(){ this._combine(this.set, []); this.emit('end') }
}
```

`SubsetSum`은 `EventEmitter`를 상속해 `match`/`end` 이벤트를 발행하는 **옵서버 패턴**으로 설계되어, 계산이 다 끝나길 기다리지 않고 매칭될 때마다 즉시 결과를 스트리밍할 수 있다(`index.mjs`에서 `res.cork()`/`res.uncork()`로 작은 write들을 모아 큰 TCP 패킷으로 묶어 보냄). 하지만 `_combine`이 완전히 동기적이라 큰 입력에서는 이벤트 루프를 오래 점유한다.

**해법 A — Interleaving(이벤트 루프에 양보).**

```js
// chapters/chapter11_recipe/04-cpu-bound-task/interleaving/subsetSumDefer.mjs:22-31
_combineInterleaved(set, subset){
    this.runningCombine++;
    setImmediate(() => {
        this._combine(set, subset);
        if(--this.runningCombine === 0){ this.emit('end') }
    })
}
```

재귀 각 단계를 `setImmediate()`로 감싸 이벤트 루프에 제어권을 한 번씩 양보한다. 새 프로세스/스레드를 만들지 않으므로 오버헤드가 없고, 연산 도중에도 로그인·헬스체크 같은 가벼운 요청을 끼워 처리(interleave)할 수 있지만, **전체 연산 완료 시간 자체는 오히려 늘어난다**(각 단계 사이의 대기 시간 때문).

**해법 B — Child Process(자식 프로세스) 풀.**

```js
// chapters/chapter11_recipe/04-cpu-bound-task/process/processPool.mjs:13-53(발췌)
acquire(){
    return new Promise((resolve, reject) => {
        if(this.pool.length > 0){
            worker = this.pool.pop();
            if(worker.timeoutId){ clearTimeout(worker.timeoutId) }
            this.active.push(worker);
            return resolve(worker)
        }
        if(this.active.length >= this.poolMax){
            return this.waiting.push({resolve, reject})
        }
        worker = fork(this.file);
        worker.once('message', message => {
            if(message === 'ready'){ this.active.push(worker); return resolve(worker) }
            worker.kill();
            reject(new Error('Improper process start'))
        })
        worker.once('exit', code => { /* pool/active에서 정리 */ })
    })
}
```

`ProcessPool`은 **object pool 패턴**의 전형이다: idle 상태의 자식 프로세스를 `pool`에 보관하고, 최대치(`poolMax`)까지 새로 `fork()`하며, 그 이상 요청이 들어오면 `waiting` 큐에 쌓아 두었다가 `release()`에서 반납되는 즉시 넘겨준다. 새 프로세스는 초기화 뒤 `process.send('ready')`를 보내야 "일할 준비가 됐다"고 인정되는 **핸드셰이크 프로토콜**을 사용하며, 오래 쉬는(idle) 프로세스는 `setTimeout`으로 자동 `kill()`해 리소스를 회수한다.

```js
// chapters/chapter11_recipe/04-cpu-bound-task/process/workers/subsetSumProcessWorker.mjs:1-18
import { SubsetSum } from "../../interleaving/subsetSum.mjs";

process.on('message', msg => {
    const subsetSum = new SubsetSum(msg.sum, msg.set)
    subsetSum.on('match', data => { process.send({event: 'match', data:data}) })
    subsetSum.on('end', data => { process.send({event:'end' , data:data}) })
    subsetSum.start();
})
process.send('ready');
```

```js
// chapters/chapter11_recipe/04-cpu-bound-task/process/index.mjs (SubsetSum 래퍼):14-27
async start(){
    const worker = await workers.acquire()
    worker.send({sum: this.sum, set: this.set})
    const onMessage = msg => {
        if (msg.event === 'end') { worker.removeListener('message', onMessage); workers.release(worker) }
        this.emit(msg.event, msg.data)
    }
    worker.on('message', onMessage)
}
```

부모(HTTP 서버)와 자식(연산 워커)은 **메모리를 공유하지 않고 IPC(`process.send`/`worker.on('message')`)로만 통신**한다. 자식 내부에서 발생한 `match`/`end` 이벤트를 `process.send`로 부모에게 전달하면, 부모 쪽 `SubsetSum` 래퍼가 이를 받아 다시 `this.emit(...)`으로 재발행해 원래 `EventEmitter` 기반 API를 그대로 유지한다 — 호출부(`index.mjs`, HTTP 핸들러) 코드는 로컬 실행이든 프로세스 위임이든 동일하게 `.on('match', ...)`을 쓸 수 있다. `os.mjs`는 `node:os`의 `cpus()`로 코어별 `times`(user/nice/sys/idle/irq)를 두 시점에서 스냅샷해 CPU 사용률(%)을 계산하는 보조 스크립트다.

**해법 C — Worker Threads 풀.**

```js
// chapters/chapter11_recipe/04-cpu-bound-task/thread/threadPool.mjs:12-34(발췌)
worker = new Worker(this.file);
worker.once('online', () => { this.active.push(worker); resolve(worker) })
worker.once('exit', code => { /* 정리 */ })
```

```js
// chapters/chapter11_recipe/04-cpu-bound-task/thread/worker/subsetSumThreadWorker.mjs:1-17
import { parentPort } from "node:worker_threads";
parentPort.on('message', msg => {
    const subsetSum = new SubsetSum(msg.sum, msg.set)
    subsetSum.on('match', data => { parentPort.postMessage({event: 'match', data:data}) })
    subsetSum.on('end', data => { parentPort.postMessage({event:'end', data:data}) })
    subsetSum.start();
})
```

`ProcessPool`과 뼈대는 거의 동일하지만 `fork()`/`process.send` 대신 `new Worker()`/`parentPort.postMessage`를 쓰고, ready 이벤트도 `'ready'` 메시지 대신 워커 스레드가 자체 제공하는 `'online'` 이벤트를 사용한다(핸드셰이크가 불필요해짐). **프로세스 vs 스레드 선택 기준**(`study.txt` 요약): CPU 집약적 순수 연산에는 워커 스레드(생성 비용·메모리 오버헤드가 훨씬 작고, 대량 데이터 공유가 필요하면 `SharedArrayBuffer`도 가능), 앱 자체를 스케일 아웃하려는 경우(포트 공유·로드밸런싱)에는 `cluster`/자식 프로세스. I/O 작업에는 워커 스레드가 오히려 손해 — Node의 비동기 I/O(libuv)가 훨씬 효율적이기 때문이다.

**스레드 간 격리.** Node 워커는 기본적으로 메모리를 공유하지 않는 "메모리 격리" 모델을 채택한다(C/Java의 공유 메모리 모델과 반대). `postMessage`는 구조화된 복제 알고리즘(structured clone, `JSON.stringify`보다 강력함)으로 데이터를 **복사**해서 전달하며, 그 덕분에 개발자가 뮤텍스·락 같은 동기화 도구 없이도 안전하게 멀티스레딩을 할 수 있다.

### 개념 5: 에러 처리 (error.mjs)

```js
// chapters/chapter11_recipe/error.mjs:1-17
function delay(ms) {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Promise가 reject 되었습니다!')), ms);
    });
}

async function handleAsyncError() {
    console.log('비동기 작업 시작...');
    try {
      await delay(1000); // Promise가 reject되면 await가 에러를 throw한 것처럼 동작
    } catch (err) {
      console.log('async/await와 함께 try...catch로 비동기 에러를 잡았습니다!');
      console.error(err.message);
    }
}
handleAsyncError();
```

`await`는 프로미스가 reject되면 그 지점에서 마치 `throw`가 일어난 것처럼 동작하므로, 동기 코드에서 쓰던 `try...catch`를 비동기 코드에도 그대로 적용할 수 있다는 것이 요지다. 파일 하단 주석에는 **콜 스택(Call Stack)과 에러 전파(스택 되감기, Stack Unwinding)** 과정을 함수 A→B→C 호출 예시로 상세히 정리해두었다 — `functionC`에서 던진 에러가 `catch`가 없는 `functionC`, `functionB`를 차례로 빠져나와(스택에서 pop) 마침내 `try...catch`가 있는 `functionA`에서 잡히는 흐름이다. 이는 Promise 체인/`async-await`에서도 동일한 원리로 에러가 "가장 가까운 처리 지점"까지 전파된다는 점을 이해하는 데 필수적인 배경 지식이다.

### 개념 6: exercise 폴더 — 각 레시피의 응용/변형

**exercise/asyncCancel — 제너레이터 기반 취소 가능 작업.** 표준 `AbortController`로는 "실행 중인 임의의 비동기 흐름 전체"를 깊게(자식까지) 취소하기 까다로운데, 이를 **제너레이터 + 러너(runner)** 조합으로 해결한다.

```js
// chapters/chapter11_recipe/exercise/asyncCancel/async-generator.mjs:29-48
async function run(generator) {
  const iterator = generator();
  let result = { value: undefined, done: false };
  while (!result.done) {
    const jobResult = await result.value;       // 제너레이터가 yield한 Promise를 실행
    result = iterator.next(jobResult);           // 결과를 다시 제너레이터에 주입
  }
  return result.value;
}
```

제너레이터(`function*`)는 `yield`로 "할 일(Promise)"을 잠깐 바깥으로 던지고 멈추며, 러너가 그 Promise를 `await`한 뒤 `iterator.next(결과)`로 결과를 다시 주입하면 멈췄던 지점부터 재개된다(`generator-two-way-communication.mjs`가 이 양방향 통신의 최소 예제). 이 구조 위에 취소 기능을 얹은 것이 `asyncCancelable.mjs`다.

```js
// chapters/chapter11_recipe/exercise/asyncCancel/asyncCancelable.mjs:59-79
return {
    promise,
    cancel() {
      if (isCanceled) return;
      isCanceled = true;
      if (currentChild) { currentChild.cancel(); }   // Deep Cancel: 자식부터 취소
      try { generator.return(); } catch (e) {}         // 제너레이터를 finally로 강제 점프
      rejectPromise(new CancelationError());
    }
}
```

`createAsyncCancelable(generatorFn)`이 반환하는 객체는 `{promise, cancel}` 형태다. 취소 시 (1) 현재 `yield`된 값이 또 다른 cancelable(자식)이면 그 자식부터 재귀적으로 취소하고(**Deep Cancel**), (2) `generator.return()`으로 제너레이터 실행을 강제 종료시켜 내부의 `finally` 블록(자원 정리 코드)이 실행되게 하며, (3) 바깥 프로미스를 `CancelationError`로 reject한다. `index.mjs`의 데모는 부모 작업이 자식 작업(`childTask`)을 `yield`하는 중첩 구조에서 부모를 취소하면 자식까지 함께 취소되고 `자원이 정리되었습니다` 로그(= `finally`)가 찍히는 것을 보여준다. `task.mjs`는 이와 별개로, `AbortSignal` 하나를 여러 계층의 `nestedFunction`에 그대로 전달해 각 계층 진입 시 `abortSignal.throwIfAborted()`로 체크하는 단순한 버전이다.

**exercise/computeFarm — 임의의 사용자 코드를 격리 실행하는 컴퓨트 서버.** HTTP POST로 `{code, args}`(함수 문자열과 인자)를 받아 워커 스레드에서 실행하고 결과를 반환한다.

```js
// chapters/chapter11_recipe/exercise/computeFarm/server.mjs:14-23
req.on('end', () => {
    const { code, args } = JSON.parse(body);
    worker.postMessage({code, args})
    worker.on('message', (result) => {
        res.writeHead(200, {'content-type': 'application/json'})
        res.end(JSON.stringify({result}));
        worker.terminate();
    })
});
```

워커 내부에서는 `eval` 대신 `node:vm` 모듈로 사용자 코드를 **격리된 컨텍스트**에서 실행한다.

```js
// chapters/chapter11_recipe/exercise/computeFarm/workers/eval-newContextVer.mjs:8-16
const sandbox = {};
const func = runInNewContext(`(${code})`, sandbox, {timeout: 1000})
const res = func(...args)
```

```js
// chapters/chapter11_recipe/exercise/computeFarm/workers/computeFarmWorker.mjs:5-25(발췌)
const sandbox = { console, result: null };
vm.createContext(sandbox);          // sandbox를 재사용 가능한 컨텍스트로 "Contextify"
const wrappedCode = `
  const fn = ${code};
  result = fn(...${JSON.stringify(args)});
`;
vm.runInContext(wrappedCode, sandbox, { timeout: 1000 });
parentPort.postMessage(sandbox.result);
```

`eval`은 현재 스코프의 모든 변수·모듈(`fs`, `process` 등)에 접근 가능해 위험하지만, `vm.runInNewContext`/`vm.createContext` + `runInContext`는 완전히 새로운 전역 객체(`sandbox`)를 만들어 그 안에서만 코드를 실행시키므로 파일시스템·프로세스 접근이 원천 차단된다. `runInNewContext`는 호출마다 새 컨텍스트를 만드는 반면, `createContext`로 미리 컨텍스트를 만들어두고 재사용하면(`computeFarmWorker.mjs` 버전) 여러 스크립트가 상태를 공유하거나 반복 실행 성능이 필요할 때 유리하다. `timeout` 옵션으로 무한루프 코드도 강제 종료시킬 수 있다 — **신뢰할 수 없는 코드(플러그인, 온라인 코드 에디터, 테스트 프레임워크의 파일 간 격리 등)**를 실행해야 하는 실무 상황에 직접 적용 가능한 패턴이다. `computeFarm/study.txt`에는 이와 함께 HTTP 원시 API(`req.on('data'/'end')`로 직접 body 파싱)와 Express `express.json()` 미들웨어의 차이, JIT 컴파일 동작 원리, libuv 스레드 풀을 쓰는 비동기 작업과 쓰지 않는 비동기 작업의 구분(`UV_THREADPOOL_SIZE`, 기본 4개)까지 폭넓게 정리되어 있다.

**exercise/totalSalesCb — 콜백 스타일로 재구현한 배치+캐싱.** 02번 레시피(Promise 기반)를 콜백 기반 API로 옮긴 버전.

```js
// chapters/chapter11_recipe/exercise/totalSalesCb/totalSalesCache.mjs:14-31(발췌)
export function totalSalesWrapper(product, callback) {
  if (cache.has(product)) {
    return process.nextTick(callback, null, cache.get(product));
  }
  if (inFlight.has(product)) {
    inFlight.get(product).push(callback);   // 대기열에 콜백만 추가
    return;
  }
  inFlight.set(product, [callback]);
  const specialCallback = (err, result) => {
    if (!err) {
      cache.set(product, result);
      setTimeout(() => { cache.delete(product) }, CACHE_TTL);
    }
    const waitingCallbacks = inFlight.get(product);
    inFlight.delete(product);
    for (const waitingCb of waitingCallbacks) { process.nextTick(waitingCb, err, result); }
  };
  totalSalesRaw(product, specialCallback);
}
```

Promise 버전에서는 "프로미스 자체가 여러 소비자에게 공유 가능한 값"이라 Map에 프로미스를 저장하는 것만으로 배칭이 됐지만, 콜백 방식에는 그런 공유 메커니즘이 없다. 그래서 `inFlight` Map은 프로미스 대신 **콜백들의 배열**을 저장하고, 계산이 끝나면 그 배열을 순회하며 `process.nextTick`으로 각 콜백에 결과를 통지한다. 캐시 히트 시에도 일부러 `process.nextTick`을 거치는 이유는 "캐시가 없을 때는 항상 비동기, 캐시가 있을 때는 동기"처럼 **호출 타이밍이 오락가락하는 API**(Zalgo 문제)를 피해 항상 비동기로 동작을 통일하기 위함이다.

**exercise/wrapper-queue — Proxy로 초기화 큐를 범용화.** 01번 레시피(`02-db-init-queue`)의 아이디어를 **특정 DB 클래스에 종속되지 않는 범용 데코레이터**로 일반화한 것.

```js
// chapters/chapter11_recipe/exercise/wrapper-queue/wrapperQueue.mjs:1-39(발췌)
export function wrapperQueue(target, options){
    const {initMethod, initProperty, watchMethods} = options;
    let isInitialized = false;
    const queue = []

    return new Proxy(target, {
        get(target, property){
            if(typeof target[property] !== 'function') return target[property];
            return function(...args){
                if(property === initMethod){
                    return target[property].apply(target, args).then((result) => {
                        isInitialized = true;
                        while(queue.length > 0){
                            const { prop, params, resolve, reject } = queue.shift();
                            try { resolve(target[prop].apply(target, params)); }
                            catch (err) { reject(err); }
                        }
                        return result
                    })
                }
                if(watchMethods.includes(property) && !isInitialized){
                    return new Promise((resolve, reject) => {
                        queue.push({prop: property, params: args, resolve, reject})
                    })
                }
                return target[property].apply(target, args);
            }
        }
    })
}
```

```js
// chapters/chapter11_recipe/exercise/wrapper-queue/index.mjs:5-13
const consumer = {
    initMethod: 'connect',
    initProperty: 'isReady',
    watchMethods: ['query', 'exec']
}
const asyncInstance = wrapperQueue(db, consumer)
asyncInstance.query('SELECT * FROM users')   // 큐에 쌓임
asyncInstance.connect();                      // 초기화 트리거 → 완료 시 큐 flush
asyncInstance.query('SELECT * FROM users')    // 이미 초기화됐으므로 바로 통과
```

`Proxy`의 `get` 트랩으로 메서드 호출을 가로채서, 호출된 메서드가 (a) `initMethod`(예: `connect`)면 완료 후 대기 큐를 비우고, (b) `watchMethods`에 포함되고 아직 초기화 전이면 큐에 넣은 새 Promise를 반환하고, (c) 그 외에는 원본 메서드를 그대로 호출한다. 이렇게 하면 **DB 클래스 내부를 전혀 건드리지 않고** 초기화 대기 큐 로직을 외부에서 주입할 수 있다 — 데코레이터/AOP 스타일로 여러 클래스에 재사용 가능하다는 점이 `02-db-init-queue`의 하드코딩 버전과 다른 지점이다. `study.txt`에는 이 문제를 풀며 겪은 시행착오(프로미스를 언제 반환해야 하는지, args 처리, initMethod 여부를 먼저 체크해야 하는 순서 문제)가 기록되어 있다.

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가

- **외부 리소스(DB, 캐시, 외부 API) 연결 로직을 짤 때**: boolean 플래그 대신 "연결 중인 프로미스 자체"를 캐싱하는 싱글톤 프로미스 패턴을 쓰고 있는지 확인 → `01-asynchronous-init/01-db/db.mjs`.
- **같은 무거운 조회가 짧은 시간에 반복 호출될 가능성이 있을 때**: Batching(진행 중 프로미스 공유) + TTL 캐싱을 함께 쓰는지, 캐시 용량 제한이 필요하면 LRU를 쓰는지 검토 → `02-async-batch-caching/totalSalesCache.mjs`, `LruCache.mjs`.
- **사용자가 취소할 수 있어야 하는 비동기 작업(검색, 업로드, 타임아웃)을 만들 때**: 자체 취소 플래그보다 표준 `AbortController`/`AbortSignal`을 우선 고려 → `03-asynchronous-cancel/abortController/`, `study-abortController.txt`의 실무 예시.
- **여러 단계에 걸친(제너레이터/자식 작업 포함) 복잡한 흐름을 깊게 취소해야 할 때**: `exercise/asyncCancel/asyncCancelable.mjs`의 Deep Cancel + `generator.return()` + `finally` 자원 정리 패턴 참고.
- **CPU 바운드 연산(대량 재귀, 이미지/데이터 처리 등)이 이벤트 루프를 막을 위험이 있을 때**: 규모가 작으면 `setImmediate` 인터리빙, 재사용 가능한 워커 풀이 필요하면 `ProcessPool`/`ThreadPool` 패턴, "확장이냐 순수 연산이냐"로 자식 프로세스 vs 워커 스레드를 선택 → `04-cpu-bound-task/`.
- **신뢰할 수 없는 사용자 코드를 서버에서 실행해야 할 때**: `eval` 금지, `node:vm`의 `runInContext`/`createContext` + `timeout` 옵션으로 샌드박스 격리 → `exercise/computeFarm/workers/`.
- **기존 클래스를 건드리지 않고 초기화 대기 로직을 붙이고 싶을 때**: `Proxy` 기반 `wrapperQueue` 데코레이터 패턴 재사용 가능 → `exercise/wrapper-queue/wrapperQueue.mjs`.
