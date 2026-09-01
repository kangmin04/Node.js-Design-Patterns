# Chapter 11 — 비동기 레시피

실무에서 자주 마주치는 비동기 문제들에 대한 구체적인 해법(레시피)을 다룬다:
비동기 초기화, 배치/캐싱, 취소, CPU-bound 작업 처리.

| 디렉토리 | 내용 |
|---|---|
| `01-asynchronous-init/` | 비동기 초기화 패턴 — DB 연결 지연 시작(`01-db`), 초기화 대기 큐(`02-db-init-queue`), 상태 기반 초기화(`03-db-state`). `study.txt` 포함 |
| `02-async-batch-caching/` | 여러 요청을 배치로 묶어 처리(`totalSalesBatch.mjs`)하고 LRU 캐시로 캐싱(`LruCache.mjs`, `totalSalesCache.mjs`). LevelDB 데이터(`sales/`) 포함. `study.txt` 포함 |
| `03-asynchronous-cancel/` | 비동기 작업 취소 — 단순 취소 플래그(`simple`), 취소 로직을 감싸는 wrapper(`wrapper`), 표준 `AbortController`(`abortController`). `study-abortController.txt` 포함 |
| `04-cpu-bound-task/` | CPU-bound 작업 처리 — 이벤트 루프 양보(interleaving), 자식 프로세스 풀(`process`), 워커 스레드 풀(`thread`). `process/study.txt` 포함 |
| `exercise/` | `asyncCancel`(제너레이터 기반 취소 가능 작업), `computeFarm`(작업 분산 서버), `totalSalesCb`(콜백 버전 배치/캐싱), `wrapper-queue`(취소 wrapper + 큐 결합) — 각각 `study.txt` 포함 |

챕터 루트의 `error.mjs`, `study.txt`도 참고.
