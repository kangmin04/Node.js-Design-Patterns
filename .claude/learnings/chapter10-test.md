# Chapter 10 — 테스트

## 개요
이 챕터는 `01-firstTest`의 "assert만 손으로 호출하는 테스트"에서 출발해, Node.js 내장 `node:test` 러너를 단계적으로 도입하며 subset 실행 → 파라미터화 → suite 그룹화 → skip/only 필터링 → 커버리지 측정까지 러너의 기능을 하나씩 켜본다. 이후 `08-unit-test`에서 진짜 단위 테스트(TaskQueue의 이벤트 기반 비동기 검증)와 모킹(`mock.fn`, `mock.method`, `mock.module`)을 파고들고, 그 모킹의 단점(전역 오염, tight coupling)을 의존성 주입(DI)으로 해소하는 흐름을 보여준다. `09-integration-test`에서는 SQLite in-memory DB와 Fastify의 `app.inject()`로 실제 컴포넌트 간 연동을 검증하고, `10-e2e-test`에서는 Playwright로 브라우저를 통해 사용자 관점의 블랙박스 테스트를 수행한다. 마지막 `11-exercise`는 이 모든 기법(순수 함수 단위 테스트, 비동기 재시도 모킹, DI 비교, 통합 테스트)을 종합 연습한다. 즉 이 챕터의 학습 곡선은 "**직접 assert 호출 → 러너에 위임 → 격리(mock/DI) → 컴포넌트 통합 → 전체 시스템(E2E)**"으로 점점 넓은 스코프를 검증하는 방향으로 발전한다.

### 개념 1 — 테스트의 기본 구조: SUT, AAA 패턴, assert
가장 원초적인 테스트는 테스트 러너 없이 `node:assert/strict`만으로 작성한다. `equal()`은 `===`와 유사한 얕은 비교이고, 객체 내부까지 재귀적으로 비교하려면 `deepEqual`/`deepStrictEqual`을 써야 한다.

```js
// 01-firstTest/test.mjs:1-16
import {equal} from 'node:assert/strict'  //strict 없는건 deprecated
import { calculateBasketTotal } from './calculateBasketTotal.mjs'

/* arange */
const basket = {
    items: [
      { name: 'Croissant', unitPrice: 2, quantity: 2 },
      { name: 'Olive bread', unitPrice: 3, quantity: 1 },
    ],
  }

  /* act: execute SUT(calculate function) */
  const result = calculateBasketTotal(basket)

  /* assert */
  const expectedResult = 7;
```

- **SUT(System Under Test)**: 테스트 대상이 되는 함수/모듈/컴포넌트. 여기서는 `calculateBasketTotal`.
- **AAA 패턴(Arrange-Act-Assert)**: 모든 테스트를 "사전조건 준비 → SUT 실행 → 결과 검증" 3단계로 구조화하면 가독성과 유지보수성이 올라간다.
- **`equal` vs `deepEqual`**: `equal`은 객체를 참조 주소로 비교(shallow copy와 유사한 개념)하므로 구조/내용이 같아도 다른 인스턴스면 실패한다. 객체 구조 비교가 필요하면 `deepEqual`(deep copy와 유사, 재귀적으로 키를 순회하며 비교).
- 이 단계는 러너가 없으므로 `node 01-firstTest/test.mjs`로 직접 실행하고, 실패해도 프로세스가 그냥 죽는다 — 다음 개념에서 러너를 도입하는 이유가 여기서 드러난다.

### 개념 2 — `node:test` 러너 도입과 3가지 테스트 함수 형태
`test()` 함수를 임포트하면 파일명을 `*.test.mjs`로 짓는 컨벤션이 생기고, 한 파일에 여러 테스트를 담을 수 있으며, 러너가 pass/fail을 집계해준다.

```js
// 02-firstTestRunner/calculateBasketTotal.test.mjs:1-10
import {equal} from 'node:assert/strict' 
import {test} from 'node:test'
import { calculateBasketTotal } from './calculateBasketTotal.mjs'

/* test 내부의 함수: function under test (FUT) */
test('Calculates basket total' , () => { 
```

```js
// 02-firstTestRunner/function.test.mjs:1-18
import { test } from 'node:test'

test('passing sync test', _t => {})
test('failing sync test', _t => {
  throw new Error('fail')
})

test('passing async test with promise', _t => Promise.resolve())
test('failing async test with promise', _t => Promise.reject(new Error('fail')))

test('passing async test with async', async _t => {})
test('failing async test with async', async _t => {
  throw new Error('fail')
})

test('passing async test with callback', (_t, done) => done())
test('failing async test with callback', (_t, done) => done(new Error('fail')))
```

- 테스트 함수(FUT: function under test)는 3가지 형태로 작성 가능: **동기 함수**(throw하면 실패), **Promise/async 함수**(reject하면 실패, 현대적 권장 방식), **콜백 방식**(두 번째 인자 `done`을 받아 `done()`/`done(err)`로 성공·실패 표시).
- **혼용 금지**: `async (t, done) => {...}`처럼 async와 콜백을 동시에 쓰면 러너가 "Passed a callback but also returned a Promise" 에러로 실패시킨다 — 둘 중 하나만 선택해야 한다.
- 테스트 파일 위치는 자유지만 관례상 테스트 대상과 같은 디렉토리에 둔다. `node --test`는 기본적으로 `*.test.js`, `*-test.js`/`*_test.js`, `test/` 디렉토리, `test-*.js` 패턴을 자동으로 찾는다.

### 개념 3 — subset 실행과 concurrency
큰 테스트 파일을 계층적으로 묶어 가독성을 높이고, 서브테스트를 동시에 실행해 속도를 높일 수 있다.

```js
// 03-subset/concurrency-subset.test.mjs:1-12
import {test} from 'node:test'

 test('Top level test', { concurrency: true}, t =>  {
    t.test('Subset 1' , _t => {

    })

    t.test('Subset 2' , _t => {

    })

})
```

- `concurrency: true`는 시스템이 허용하는 최대치로 병렬 실행, `concurrency: N`은 최대 동시 개수, `false`(=1)는 순차 실행.
- Node 24 미만에서는 `t.test(...)`를 `await` 없이 호출하면 실행 순서가 보장되지 않을 수 있어 `03-subset/subset.test.mjs:3-11`처럼 `await t.test(...)`로 명시해야 한다.
- 여러 **파일** 간 동시성은 `node --test-concurrency=N`으로 제어하며, 테스트 간 상호 의존성이 있다면(가급적 피해야 하지만) `--test-concurrency=1`로 순차 실행할 수 있다.

### 개념 4 — 파라미터화 테스트 (parametrized test)
동일한 검증 로직을 여러 입력 케이스에 대해 반복할 때, 배열 + `for...of` + `t.test()`로 케이스마다 서브테스트를 동적으로 생성한다.

```js
// 04-parametrizedTest/calculateBasketTotal.test.mjs:5-38
test('Calculates basket total' , {concurrency: true}, t => {
const cases = [
    { name: 'Empty basket', basket: { items: [] }, expectedTotal: 0 },
    { name: 'One croissant', basket: { items: [{ name: 'Croissant', unitPrice: 2, quantity: 1 }] }, expectedTotal: 2 },
    { name: 'Two croissants and one olive bread', basket: { items: [
          { name: 'Croissant', unitPrice: 2, quantity: 2 },
          { name: 'Olive bread', unitPrice: 3, quantity: 1 },
        ] }, expectedTotal: 7 },
  ]
  for (const {name, basket, expectedTotal} of cases) {
    t.test(name, () => {
        const result = calculateBasketTotal(basket)
        equal(result, expectedTotal, `Expected total to be ${expectedTotal}, but got ${result}`)
    })
  }
})
```

- 케이스 배열에 `name`을 포함시켜 실패 시 어떤 케이스가 실패했는지 리포터에서 바로 식별 가능하게 하는 것이 핵심 트레이드오프(테스트 이름의 가독성 vs 코드 중복 제거).
- 경계값(빈 바구니), 일반값, 복합값을 각각 케이스로 나눠 커버리지를 넓힌다.

### 개념 5 — suite를 통한 테스트 그룹화
`suite`/`test`는 다른 프레임워크의 `describe`/`it`과 동일한 개념이며, Node 러너는 두 API를 모두 제공한다.

```js
// 05-suite-test/suite.test.mjs:1-6
import {test, suite, describe, it} from 'node:test'

suite('Top level suite' , {concurrency: true} , () => {
    test('Subtest 1', () => {})
    test('Subtest 2', () => {})
})
```

- `suite`는 관련 테스트를 논리적으로 묶는 단위이며, `describe`/`it`으로 이름만 바꿔도 동일하게 동작한다(가독성/컨벤션 선택 문제).
- `--test-reporter=spec`(기본, 사람이 읽기 좋은 트리 형태), `=tap`(Test Anything Protocol, CI/서드파티 도구와 연동), `=dot`(성공/실패를 점으로 압축 표시) 등 리포터를 바꿔 출력 형식을 CI 요구사항에 맞출 수 있다.

### 개념 6 — 테스트 스킵·필터링 (skip / todo / only)
```js
// 06-skip-test/shortcuts.test.mjs:1-10
import {test, suite} from 'node:test'

test('A skipped test', (t) => {
    t.skip(true)
})

test('A todo test', (t) => {
    t.todo(true)
})
```

```js
// 06-skip-test/filter.test.mjs:31-38
suite('Top level suite 1' , {concurrency: true, skip: true} , () => {
    test('Test 1', () => {})
    test('Test 2', () => {})
})

suite('Top level suite 2' , {concurrency: true} , () => {
    test('Test 1', {skip: true}, () => {})
    test('Test 2', {only: true} , () => {})
})
```

- **`t.skip`**: 이미 작성됐지만 일시적으로(버그로 실패 중이거나 아직 안 고쳐진 기능) 건너뛰고 싶을 때.
- **`t.todo`**: 아직 작성 안 한 테스트를 표시하는 용도. 실제로 내부 코드는 **실행**되며, 실패해도 pass/fail 집계에는 안 잡히고 "failing test" 정보만 콘솔에 남는다 — `t.skip`과 달리 코드가 돌아간다는 점이 중요한 차이.
- **`only: true`**(옵션) 또는 `t.only()`는 지정된 테스트/suite만 실행 — 단, 실행하려면 CLI에 `--test-only` 플래그가 필요하다.
- CLI 필터: `node --test --test-name-pattern="패턴"`(이름 매칭만 실행), `--test-skip-pattern="패턴"`(해당 이름 스킵, Node 20에서는 미지원 가능성 있음을 study.txt에 직접 확인해둠).

### 개념 7 — 코드 커버리지와 그 함정
```js
// 07-coverage/conditional.js:1-9
export function getCategory(value) {
  if (value > 10) {
    return 'A';
  } else {
    return 'B';
  }
}
```

```js
// 07-coverage/if-only.test.mjs:1-7
test('getCategory - covers only the if branch', () => {
  assert.strictEqual(getCategory(20), 'A');
});
```

- 실행: `node --test --experimental-test-coverage`. `if-only.test.mjs`만 실행하면 `else` 분기가 안 돌아가 branch coverage가 66.67%로 떨어지고 uncovered lines로 `7-8`이 리포트된다. `all-branches.test.mjs`처럼 `if`/`else` 양쪽을 검증하는 케이스를 추가하면 100%가 된다.
- **커버리지 지표**: 라인(Line), 분기(Branch), 구문(Statement), 함수(Function) 커버리지 등.
- **함정**: "높은 커버리지가 높은 품질을 보장하지 않는다." Assertion 없이 코드만 실행하고 지나가는 테스트도 100% 커버리지를 만들 수 있으므로, 커버리지는 **목표가 아니라 의미 있는 테스트를 짰을 때 따라오는 부산물**로 취급해야 한다.

### 개념 8 — 단위 테스트: 이벤트 기반 비동기 컴포넌트(TaskQueue) 테스트
`08-01-unitest`는 `EventEmitter`를 상속한 동시성 큐를 실제로 단위 테스트하며, Promise 기반 동기화 기법(`once`, `Promise.withResolvers`)을 사용한다.

```js
// 08-unit-test/08-01-unitest/Taskqueue.mjs:15-30
next() {
  if( this.running === 0 && this.queue.length === 0){
    return this.emit('empty'); 
  }
  while (
    this.running < this.concurrency && this.queue.length > 0) {
    const task = this.queue.shift()
    task()
      .catch(err => this.emit('taskError' , err))
      .finally(() => {
        this.running--
        this.next(); 
      })
    this.running++
  }
}
```

```js
// 08-unit-test/08-01-unitest/Taskqueue.test.mjs:70-96
test('Emits "TaskError" on task failure' , async() => {
    const queue = new TaskQueue(2); 
    const errors = []; 
    queue.on('taskError' , (err) => { errors.push(err.message) })
    queue.pushTask(async () => { await setImmediate(); throw new Error('Task failed 1') })
    queue.pushTask(async () => { await setImmediate(); throw new Error('Task failed 2') })
    await once(queue, 'empty')
    assert.equal(errors.length, 2)
    assert.equal(errors[0] , 'Task failed 1')
    assert.equal(errors[1] , 'Task failed 2')
})
```

- **`suite(..., {concurrency: true, timeout: 500})`**: 관련 테스트를 그룹화하면서 각 비동기 테스트에 500ms 타임아웃을 걸어 무한 대기를 방지.
- **`await once(queue, 'empty')`**: 이벤트 기반 완료 신호를 Promise로 변환해 대기하는 패턴. 이 `await`가 없으면 태스크가 큐에 push되기 전에 assert가 먼저 실행되는 레이스가 발생할 수 있다는 점을 주석으로 직접 검증해둠.
- `Promise.withResolvers()`로 콜백 스코프 밖에서 resolve/reject를 다룰 수 있다(수동 스파이 구현의 원형) — 이후 개념 9의 `mock.fn`이 이 수작업을 대체한다.

### 개념 9 — 모킹: `mock.fn`, `mock.method`, `mock.module`
**(a) `mock.fn`으로 순수 스파이 함수 만들기**

```js
// 08-unit-test/08-02-mock/01-mock-basic.test.mjs:5-15
test('mock.fn 예제', () => {
    const myFn = mock.fn();
    myFn(1, 'a');
    const sum = mock.fn((a, b) => a + b);
    sum(3, 4);
    console.log(sum.mock.calls[0].arguments) //[3,4]
    console.log(sum.mock.calls[0].result) // 7
});
```

TaskQueue 테스트도 `mock.fn`을 쓰면 수동 플래그/Promise 로직이 사라진다:

```js
// 08-unit-test/08-02-mock/02-mock.test.mjs:7-22
const task1 = mock.fn(async () => { await setImmediate(); })
const task2 = mock.fn(async () => { await setImmediate(); })
queue.pushTask(task1).pushTask(task2)
await once(queue, 'empty') 
assert.equal(task1.mock.callCount() , 1)
assert.equal(task2.mock.callCount() , 1)
```

**(b) `t.mock.method`로 전역/객체 메서드 교체 — HTTP 의존성 격리**

```js
// 08-unit-test/08-02-mock/03-http/getPageLinks.test.mjs:31-40
t.mock.method(global, 'fetch', async _url => ({ 
  ok: true,
  status: 200,
  headers: { get: key => key === 'content-type' ? 'text/html; charset=utf-8' : null },
  text: async () => mockHtml,
}))
```

- 실제 `fetch(loige.co)`를 그대로 테스트에 쓰면 (1) 외부 사이트 콘텐츠 변경에 테스트가 종속되고 (2) 네트워크 상태에 따라 결과가 비결정적이며 (3) 에러 응답 같은 예외 케이스를 재현하기 어렵다 — 이 3가지가 모킹이 필요한 이유. 파일 상단의 `test.skip(...)`이 "실제 fetch를 쓴 나쁜 예"로 남아 있어 대조가 뚜렷하다.
- 대안으로 `undici`의 `MockAgent`를 `setGlobalDispatcher`로 등록해 더 실제 HTTP 계층에 가까운 방식으로 모킹할 수도 있다(같은 파일 52-91행). `beforeEach`/`afterEach` 훅으로 매 테스트 전후 dispatcher를 교체·복원한다.
- **`t.mock.method`의 장점**: 테스트가 끝나면 원래 메서드로 **자동 복원**되어 "테스트 오염(한 테스트의 모킹이 다른 테스트에 영향을 주는 문제)"을 방지한다. `mock.fn`은 반대로 아무것도 대체하지 않고 새 가짜 함수를 만들 뿐(DI/콜백용).

**(c) `t.mock.module`로 코어 모듈(`fs/promises`) 격리**

```js
// 08-unit-test/08-02-mock/04-coremodule/saveConfig.test.mjs:9-36
test('Creates folder (if needed)', async t => {
    const mockMkdir = mock.fn(); 
    const mockAccess = mock.fn(async _t => { await setImmediate(); throw new Error('ENOENT') })
    t.mock.module('node:fs/promises', {
        cache: false, 
        namedExports: { access: mockAccess, mkdir: mockMkdir, writeFile: mock.fn() }
    })
    const {saveConfig} = await import('./saveConfig.mjs')
    await saveConfig('./path/to/configs/app.json', { port: 3000 })
    assert.equal(mockMkdir.mock.callCount(), 1)
})
```

- **핵심 규칙**: mock을 등록한 **이후에** 동적 `import()`로 대상 모듈을 불러와야 한다. 먼저 import해두면 실제 `fs/promises`가 이미 바인딩되어 mock이 반영되지 않는다.
- `cache: false`가 중요 — `true`면 이미 로드된 모듈이 캐시에서 재사용되어 mock이 무시된다.
- 시나리오 설계: `mockAccess`가 `ENOENT`를 던지면 "폴더 없음" 상황이므로 `saveConfig`가 내부적으로 `mkdir`을 호출해야 하고(`mockMkdir.mock.callCount() === 1`), 정상 완료되면 "폴더 이미 있음"이므로 `mkdir`이 호출되지 않아야 한다(`=== 0`) — 스텁(항상 같은 응답)과 스파이(호출 여부/횟수 기록)를 결합한 전형적 테스트 더블 사용법.

**(d) `mock.module`로 다른 프로젝트 모듈(DB 클라이언트) 격리 — 그리고 그 단점**

```js
// 08-unit-test/08-02-mock/05-othermodule/db/payments.test.mjs:36-56
mock.module('./dbClient.mjs' , {
    cache: false, 
    namedExports: {
        Dbclient: class DbMock { query = queryMock }
    }
})
const { canPayWithVouchers } = await import('./payments.mjs')
suite('canPayWithVouchers', { concurrency: false, timeout: 500 }, () => {
  beforeEach(() => { queryMock.mock.resetCalls() })
  after(() => { queryMock.mock.restore() })
  ...
})
```

- `mock.module`은 **전역/모듈 스코프**에 영향을 주므로 `queryMock`을 파일 최상단에 두고 `beforeEach`마다 `resetCalls()`로 초기화해야 테스트 간 오염을 막을 수 있다.
- 이 방식의 단점(주석에 명시): ① 의존성이 바뀌면 테스트 코드도 같이 바꿔야 하는 **tight coupling**, ② 전역 스코프 오염, ③ 셋업 복잡도 증가, ④ 현재 Node 버전에서는 모듈 모킹 시 `concurrency: false`를 강제해야 해 **성능이 떨어짐**. → 이 4가지 단점이 다음 개념(DI)으로 넘어가는 동기가 된다.

### 개념 10 — 의존성 주입(DI)을 통한 테스트 격리 개선
개념 9(d)와 동일한 `canPayWithVouchers` 로직을 DB 클라이언트를 **인자로 주입**하는 형태로 재작성하면 동적 import와 전역 모킹이 통째로 사라진다.

```js
// 08-unit-test/08-03-DI/db/payments.mjs:5-15
export async function canPayWithVouchers(db, userId, amount) {
    const vouchers = await db.query(
      `SELECT * FROM vouchers WHERE user_id = ? AND balance > 0 AND expiresAt > NOW()`,
      [userId]
    )
    const availableBalance = vouchers.reduce((acc, v) => acc + v.balance, 0)
    return availableBalance >= amount
  }
```

```js
// 08-unit-test/08-03-DI/db/payments.test.mjs:25-36
suite('canPayWithVouchers', { concurrency: true, timeout: 500 }, () => {
  test('Returns true if balance is enough', async t => {
    const dbMock = {
      query: t.mock.fn(async (_sql, _params) => { await setImmediate(); return sampleRecords }),
    }
    const result = await canPayWithVouchers(dbMock, 'user1', 18)
    assert.equal(result, true)
    assert.equal(dbMock.query.mock.callCount(), 1)
  })
  ...
})
```

- DI 방식은 (1) 동적 import 불필요(정적 import로 바로 `payments.js` 사용), (2) `dbMock`이 각 테스트 내부에 지역적으로 존재해 `concurrency: true`로 안전하게 병렬 실행 가능, (3) 테스트 종료 후 별도 초기화(`resetCalls`, `restore`)가 필요 없음 — 개념 9(d)의 세 단점을 정확히 상쇄한다.
- 이는 7장에서 배운 DI 패턴("의존성을 내부에서 만들지 않고 외부에서 주입받아 재사용성·설정성·테스트 용이성을 높인다")의 실전 적용 사례다.

### 개념 11 — 통합 테스트: SQLite in-memory DB, Fastify `app.inject()`
단위 테스트는 SQL 쿼리 자체가 올바른지 확신할 수 없다는 한계가 있어, 통합 테스트에서는 쿼리 로직과 계산 로직을 분리한 뒤 실제 SQLite(in-memory)로 검증한다.

```js
// 09-integration-test/db/payments.mjs:1-21
export async function getActiveVouchers(db, userId){
    const vouchers = await db.query(
        `SELECT * FROM vouchers
           WHERE userid = ? AND
           balance > 0 AND
           expiresAt > strftime('%FT%T:%fz', 'now')`, 
        [userId]
      )
      return vouchers
}
export async function canPayWithVouchers(db, userId, amount) { 
    const vouchers = await getActiveVouchers(db, userId)
    const availableBalance = vouchers.reduce((acc, v) => acc + v.balance, 0)
    return availableBalance >= amount
  }
```

```js
// 09-integration-test/db/payments.int.test.mjs:39-46
suite('activeVouchers', {concurrency: true, timeout: 500}, () => {
    test('queries for active vouchers', async() => {
        const expected = []
        const db = new DbClient(':memory:')
        await createTables(db)
        ...
```

- `filename: ':memory:'`는 디스크에 쓰지 않고 RAM에만 존재하는 SQLite DB — 프로세스 종료 시 자동 소멸, Zero-setup(도커/서버 불필요), 네트워크 지연 없음 → 자동화 테스트에 이상적. 대비되는 파일 기반 DB(`./my_database.sqlite`)는 영구 저장용이며 디스크 I/O로 더 느리다.
- `DbClient`는 **지연 초기화(lazy initialization)** 패턴을 쓴다: `#db` 필드를 처음엔 `null`로 두고, `#connect()`가 호출될 때 비로소 연결을 생성해 재사용한다(`09-integration-test/db/dbClient.mjs:13-24`). 반대 개념인 eager initialization은 생성자에서 즉시 연결해 초기 에러를 빨리 드러내지만 미사용 자원도 항상 만든다는 트레이드오프가 있다.
- `createTables`는 `CREATE TABLE IF NOT EXISTS`로 **멱등성(idempotent)**을 보장해 여러 테스트에서 반복 호출해도 안전하다.
- HTTP 계층 통합 테스트는 Fastify의 `app.inject()`로 실제 소켓을 열지 않고 라우트 핸들러 전체(스키마 검증 포함)를 검증한다.

```js
// 09-integration-test/http/booking.int.test.mjs:8-23
test.todo('Reserving a seat works until full', async () => {
    const db = new DbClient(':memory:');
    await createTables(db);
    const app = await createApp(db);
    const response = await app.inject({
        method:'POST', url:'/events',
        payload:{ name: 'Event 1' , totalSeats: 2 }
    }); 
    assert.equal(response.statusCode, 201);
```

- `app.decorate('db', db)`(`09-integration-test/http/app.mjs:7`)로 라우트 핸들러가 `fastify.db`를 통해 주입받은 DB에 접근한다 — 여기서도 DI 사고방식이 그대로 이어진다.
- 통합 테스트는 단위 테스트보다 셋업 비용이 크고(DB/앱 인스턴스 생성) 느리지만, "쿼리 자체가 맞는지", "라우트 스키마 검증이 실제로 400을 반환하는지" 같은 컴포넌트 간 연결 지점의 신뢰도를 확보한다.

### 개념 12 — E2E 테스트: Playwright로 사용자 관점 검증
```ts
// 10-e2e-test/tests/userflow.spec.ts:4-27
test('A user can sign up and book an event', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.getByRole('link', { name: 'Sign In' }).click()
  await page.getByRole('link', { name: 'Sign up' }).click()
  const seed = Date.now().toString()
  ...
  await page.getByRole('textbox', { name: 'name' }).fill(name)
  await page.getByRole('button', { name: 'Create account' }).click()
```

```ts
// 10-e2e-test/tests/example.spec.ts:3-8
test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});
```

- E2E는 **블랙박스 테스트**: 내부 구현이 아니라 실제 사용자가 브라우저에서 겪는 흐름(회원가입 → 로그인 → 이벤트 예약 → 예약 확인)을 그대로 재현한다.
- `page.getByRole()` 같은 로케이터 기반 API + `await expect(locator).toBeVisible()` 같은 **web-first assertion**은 요소가 실제로 DOM에 나타날 때까지 자동으로 폴링·대기한다(과거 `sleep`/`timeout` 하드코딩 방식의 문제를 해결). 이 web-first assertion에는 기본 5초 타임아웃이 있다.
- 반면 동기 assertion(`toEqual`, `toContain`)이나 `click()`/`goto()` 같은 액션·내비게이션에는 개별 타임아웃이 없어 전체 테스트 타임아웃(`playwright.config.ts`)에 걸릴 수 있다 — `actionTimeout`, `navigationTimeout`을 프로젝트 설정에서 별도로 줄 수 있다.
- `playwright.config.ts`(`10-e2e-test/playwright.config.ts:14-71`)는 `fullyParallel`, CI에서만 `retries: 2`와 `workers: 1`, `chromium`/`firefox`/`webkit` 3개 브라우저 프로젝트 등 CI 환경과 로컬 환경을 구분하는 설정 패턴을 보여준다. README에 따르면 `.github/workflows/playwright.yml`이 이 디렉토리의 스펙만 별도 CI 잡으로 돌린다.
- 셋업 복잡도가 가장 크고(실제 서버 기동 필요, 주석 처리된 `testcontainers`/Docker 예시가 이를 시사), 작은 UI 텍스트 변경에도 테스트가 깨질 수 있어 **테스트 피라미드에서 가장 적게 유지**해야 하는 계층이다.

### 개념 13 — 11-exercise: 4종 연습 문제 종합
**(a) 순수 함수 단위 테스트 — `slugify`**
```js
// 11-exercise/01-unit-test-utility-function/slugify.test.mjs:5-12
suite('slugify unit test' , () => {
    test('check refineCharacter function' , () => {
        const target = `Hello World!`; 
        const result = slugify(target); 
        const expectedResult = `hello-world`
        assert.equal(result, expectedResult )
    })
})
```
외부 의존성이 전혀 없는 순수 함수는 모킹/DI 없이 입출력만 검증하면 되는 가장 단순한 단위 테스트 형태.

**(b) 비동기 재시도 함수 + `mock.fn`으로 호출 횟수 검증**
```js
// 11-exercise/02-asynchronous-retry-function/retry.test.mjs:7-23
test('retry test' , async () => {
    const asyncFn = mock.fn(async (i) => { 
    await setImmediate(); 
    if( i < 3){ throw new Error('intentional error');  }
        return 'success'
    })
    const result = await fetchWithRetry(asyncFn, 3); 
    assert.equal(result, 'success'); 
    assert.equal(asyncFn.mock.callCount(), 3)
})
```
`fetchWithRetry(asyncFn, maxRetries)`(`11-exercise/02-asynchronous-retry-function/retry.mjs:3-18`)는 실패 시 재시도하다가 마지막 시도까지 실패하면 에러 메시지를 문자열로 반환한다. `mock.fn`의 `callCount()`로 "정확히 3번 재시도했는지"까지 검증하는 것이 이 케이스의 핵심 — 결과값뿐 아니라 **호출 횟수(부작용)** 도 assertion 대상이 된다.

**(c) 전역 모킹 vs DI 비교 — `isHotIn`**
```js
// 11-exercise/03-temperature/isHotIn.mjs:1-14
export async function isHotIn(url){
    const weather = await fetch(url); 
    const threshold = thresholdFunc(weather); 
    return weather.temp > threshold ? true : false
}
export async function isHotInDI({fetch, url}){
    const weather = await fetch(url); 
    const threshold = thresholdFunc(weather); 
    return weather.temp > threshold
}
```
같은 로직을 두 버전으로 구현해두고, `isHotIn`은 `t.mock.method(global, 'fetch', ...)`로, `isHotInDI`는 `{fetch, url}` 객체 인자로 fetch를 주입받아 테스트한다. 주석에 "`{concurrency: true}` 시 fetch는 공유 자원이라 레이스 컨디션 발생 가능"이라고 명시되어 있어, **전역 모킹은 병렬 테스트와 상성이 나쁘고 DI는 병렬에 안전하다**는 개념 9→10의 교훈을 재확인한다.

**(d) 통합 테스트 종합 — 피자 주문 트래커**
```js
// 11-exercise/04-where-pizza/pizza.int.test.mjs:27-43
suite('pizza integration test' , {concurrency: true, timeout: 500}, () => {
    test('returns all three orders' , async () => {
        const db = new DbClient(':memory:')
        const pizzaTrack = new PizzaTracker(db);
        await createTables(db); 
        await pizzaTrack.placeOrder('1', 'first user', 'cheesePizza'); 
        ...
        await pizzaTrack.updateEta('1', 45)
        await pizzaTrack.markAsDelivered('2'); 
```
`getOrders()`(`11-exercise/04-where-pizza/PizzaTracker.mjs:15-17`)에 `ORDER BY id ASC`를 명시해 SQL 표준상 순서가 보장되지 않는 문제를 예방한 점, `status` 상수를 `static STATUS = {DELIVERED: 'delivered'}`로 뽑아 하드코딩을 줄인 점이 파일 상단 주석에 "개선 아이디어"로 정리되어 있다 — 통합 테스트를 작성하며 실제 DB 스키마/쿼리 설계의 허점(정렬 미보장, 매직 스트링)을 발견하는 것도 통합 테스트의 부수 효과임을 보여주는 예시.

## 테스트 레벨별 비교표 (단위 / 통합 / E2E)

| 기준 | 단위 테스트 (Unit) | 통합 테스트 (Integration) | E2E 테스트 |
|---|---|---|---|
| 범위 | 함수/클래스 하나, 완전히 고립 | 여러 컴포넌트(DB, API 라우트)의 연동 지점 | 전체 시스템, 실제 사용자 플로우 |
| 외부 의존성 | 전부 모킹/DI로 격리 (`mock.fn`, `mock.method`, `mock.module`, DI) | 실제에 가까운 대체재 사용 (SQLite `:memory:`, `app.inject()`) | 실제 서버/DB/브라우저 전부 기동 |
| 속도 | 매우 빠름 (I/O 없음) | 중간 (DB 셋업/쿼리 실행 필요) | 느림 (프로세스·브라우저 기동, 네트워크) |
| 신뢰도/보장 범위 | 로직 자체의 정확성만 보장, SQL/스키마 등은 검증 안 됨 | SQL 쿼리·라우트 스키마 등 연결부 정확성까지 보장 | 사용자에게 실제로 동작하는지까지 보장(블랙박스) |
| 디버깅 난이도 | 실패 지점이 명확 (해당 함수 내부) | 여러 컴포넌트 중 어디가 문제인지 좁혀야 함 | 가장 넓은 범위를 뒤져야 함, UI 변경에도 쉽게 깨짐 |
| 이 챕터의 예시 | `08-unit-test`(TaskQueue, mock, DI), `11-exercise` 01/02/03 | `09-integration-test`(payments SQLite, booking Fastify), `11-exercise` 04 | `10-e2e-test`(Playwright userflow) |
| 테스트 피라미드 상 비중 | 가장 많이 | 적당히 (핵심 기능 위주) | 가장 적게 (최종 안전망) |

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가
- `mock.module`을 쓰고 있는데 테스트가 서로 영향을 주는 것 같다 → 개념 9(d)/10 참고: DI로 전환하면 `beforeEach`/`resetCalls`/`concurrency: false` 없이도 병렬·격리가 동시에 해결된다.
- fetch/DB/파일시스템 등 외부 I/O를 테스트에서 실제로 호출하고 있다 → 개념 9(a)~(c)의 `mock.fn`/`t.mock.method`/`t.mock.module` 패턴(그리고 "mock 등록 후 동적 import" 규칙)을 다시 확인.
- 커버리지 수치를 KPI처럼 올리려 하고 있다 → 개념 7의 함정("assert 없는 테스트도 100% 커버리지 가능")을 상기하고, 의미 있는 분기 케이스(if/else 양쪽)를 실제로 검증하고 있는지 점검.
- 비동기 이벤트 기반 코드(EventEmitter, 큐, 재시도 로직)를 테스트할 때 타이밍 버그가 난다 → 개념 8의 `await once(emitter, 'event')` 패턴과 `suite`의 `timeout` 옵션을 참고.
- SQL 쿼리나 라우트 스키마가 실제로 맞는지 확신이 안 서는데 단위 테스트만 있다 → 개념 11로 이동: 쿼리 로직을 별도 함수로 분리하고 SQLite `:memory:` + `app.inject()`로 통합 테스트를 추가.
- E2E 테스트가 자주 깨지거나 타임아웃 원인을 못 찾겠다 → 개념 12의 web-first assertion(5초 기본 타임아웃) vs action/navigation(타임아웃 없음, config 레벨에서 별도 설정) 구분을 다시 확인.
- 새 테스트 계층을 어디에 얼마나 투자할지 고민될 때 → 위 "테스트 레벨별 비교표"와 테스트 피라미드(유닛 다수 → 통합 적당 → E2E 최소) 원칙을 기준으로 판단.
