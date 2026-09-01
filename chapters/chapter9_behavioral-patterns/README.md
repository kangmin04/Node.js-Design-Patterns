# Chapter 9 — 행동 패턴 (Behavioral Patterns)

객체 간 책임과 알고리즘을 다루는 행동 패턴들: state, strategy, iterator,
command, middleware.

| 디렉토리 | 내용 |
|---|---|
| `01-state/` | state 패턴 — TCP 소켓의 온라인/오프라인 상태 전환(`tcp/`). `index-idea.mjs`는 상태 클래스 설계를 스케치한 초안 파일 |
| `02-strategy/` | strategy 패턴 — 결제 방식 등 교체 가능한 알고리즘 예제 |
| `03-iterator-pattern/` | iterator/iterable 프로토콜 직접 구현, 제너레이터로 iterator 단순화, 스트림을 async iterator로 다루기. `study.txt`에 학습 노트 |
| `command-pattern/` | command 패턴 — 실행 취소(undo) 가능한 명령 큐, UI 이벤트 예제 |
| `middleware/` | middleware 패턴(Express 스타일 파이프라인). `study.md`에 학습 노트 |

챕터 루트의 `study.txt`에도 전체 학습 노트가 있다.
