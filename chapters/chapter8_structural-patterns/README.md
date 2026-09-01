# Chapter 8 — 구조 패턴 (Structural Patterns)

객체 사이의 관계를 다루는 구조 패턴들: proxy, decorator, adapter.

| 디렉토리 | 내용 |
|---|---|
| `01-proxy/` | proxy 패턴 — 객체 합성 방식 계산기(`01-calculator`), ES2015 `Proxy` 객체 트랩(`02-proxy-object`, 로깅/반응형 예제) |
| `02-decorator/` | decorator 패턴 — 합성/객체 증강/Proxy 기반 3가지 구현 방식 비교, LevelDB 구독 기능 데코레이팅(`level/`) |
| `03-adapter/` | adapter 패턴 — Node.js `fs` API를 LevelDB API에 맞게 어댑팅 (`fs-adapter.mjs`) |
| `exercise/` | `01-http-cache`(HTTP 캐싱 프록시), `02-consoleLogging`(콘솔 로깅 프록시/합성 비교), `03-colorlog`(색상 로그 프록시), `lazyBuffer05`(지연 로딩 버퍼) |

챕터 루트의 `study.txt`에 학습하며 정리한 개인 노트가 있다.
