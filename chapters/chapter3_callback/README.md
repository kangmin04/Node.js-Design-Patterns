# Chapter 3 — 콜백 패턴

콜백 기반 비동기 프로그래밍의 기본기: 에러 우선 콜백, 동기/비동기 혼용이 만드는
"Zalgo" 문제, observer 패턴(EventEmitter), `process.nextTick` 우선순위를 다룬다.

| 디렉토리 | 내용 |
|---|---|
| `error/` | 콜백/동기/비동기 방식의 에러 전파 비교 — `error-propagation.mjs`(동기), `async-error-propagation.mjs`(async/await), `callback-error-propagation.mjs`(콜백) 3단계로 동일 시나리오를 재구현 |
| `incosistent/` | 함수가 때로는 동기, 때로는 비동기로 동작할 때 생기는 "Zalgo" 문제 (`zalgo.mjs`, `zalgosync.mjs`, `zalgoasync.mjs`) |
| `observer/` | observer 패턴과 `EventEmitter` — 파일 검색(`findRegex.mjs`), 메모리 누수 예제(`memorylick.js`), 다운로드 진행률(`productionDownload.mjs`). `exercise/`에 Ticker 연습문제 3버전 |
| `priority/` | `process.nextTick`을 이용한 콜백 실행 우선순위 제어 (`recursivenextTick.mjs`) |
