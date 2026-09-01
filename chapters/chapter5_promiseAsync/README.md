# Chapter 5 — Promise와 async/await

콜백 기반이었던 3~4장의 예제(특히 webspider)를 Promise, 그리고 async/await로
다시 구현하며 비교한다. 이 챕터만 자체 `package.json`/`package-lock.json`을
갖는다 — 실행 전 이 폴더에서 `npm install` 필요.

| 디렉토리 | 내용 |
|---|---|
| `promise/` | Promise 기초(`promisify.mjs`), lazy promise(`lazyPromise/`), webspider의 Promise 버전(`spider2` ~ `spider4`) |
| `async/` | async/await 버전 — 에러 처리(`error.mjs`, `errorAsync.mjs`), 무한 재귀(`infiniteRecurse.mjs`), 메모리 누수 방지(`nonLeaking.mjs`), webspider의 async/await 버전(`spider2`) |
| `exercise/` | `asyncMap03`(배열 비동기 map), `dissecting01`(Promise 동작 분해, `idea.md` 포함), `taskqueueAsync02`(async 기반 작업 큐) |
