# Node.js Design Patterns 학습 노트 인덱스

- [JS 기초](chapter01-js-basics.md) — 클래스/프로토타입, 클로저, 일급 함수, Promise 기초 (뒤 챕터 사전 지식)
- [Chapter 2 — 모듈 시스템](chapter02-module.md) — CommonJS vs ESM, 모듈 캐싱, 순환 참조, 동적/JSON import
- [Chapter 3 — 콜백 패턴](chapter03-callback.md) — Zalgo 문제, 에러 전파, EventEmitter/Observer, process.nextTick 우선순위
- [Chapter 4 — 콜백 기반 비동기 제어 흐름](chapter04-async-control-flow.md) — 순차/병렬/제한된 병렬 실행, TaskQueue, 웹 크롤러(spider) 단계별 진화
- [Chapter 5 — Promise와 Async/Await](chapter05-promise-async.md) — 체이닝, 에러 전파 함정, promisify, Lazy Promise, Promise.all 직접 구현
- [Chapter 6 — 스트림](chapter06-stream.md) — Readable/Writable/Transform, 백프레셔, pipe/pipeline, fork/merge/mux-demux, 웹 스트림
- [Chapter 7 — 생성 패턴](chapter07-creational-patterns.md) — Factory, Builder, Revealing Constructor, Singleton 비교
- [Chapter 8 — 구조 패턴](chapter08-structural-patterns.md) — Proxy(4가지 구현), Decorator, Adapter(LevelDB→fs/promises)
- [Chapter 9 — 행동 패턴](chapter09-behavioral-patterns.md) — State, Strategy, Iterator(제너레이터), Command, Middleware 파이프라인
- [Chapter 10 — 테스트](chapter10-test.md) — 직접 만든 테스트 러너, node:test, 모킹 4종, 단위/통합/E2E 비교
- [Chapter 11 — 비동기 레시피](chapter11-async-recipes.md) — 비동기 초기화, 배치/캐싱(TTL/LRU), 취소(AbortController), CPU 바운드 오프로딩
- [Chapter 12 — 확장성](chapter12-scalability.md) — Scale Cube, Cluster, 로드밸런싱(동적/P2P), Docker, Kubernetes, gRPC
- [Chapter 13 — 메시징과 통합 패턴](chapter13-messaging-integration.md) — Pub/Sub, Task Distribution, Request/Reply(+Return Address)
