# Chapter 10 — 테스트

Node.js 내장 `node:test` 러너를 기초부터 시작해 단위/통합/e2e 테스트, 모킹,
의존성 주입, 커버리지까지 번호 순서(01~11)로 단계별로 학습한다.

| 디렉토리 | 내용 |
|---|---|
| `01-firstTest/` | 가장 기본적인 첫 테스트 (assert만 사용) |
| `02-firstTestRunner/` | `node:test` 러너 도입 |
| `03-subset/` | 테스트 일부만 실행하기(`only`), 동시성 옵션 |
| `04-parametrizedTest/` | 매개변수화된 테스트 (동일 로직을 여러 입력으로 반복) |
| `05-suite-test/` | `suite`로 테스트 그룹화 |
| `06-skip-test/` | 테스트 스킵, 필터링 |
| `07-coverage/` | 코드 커버리지 측정과 분기 커버리지 |
| `08-unit-test/` | 단위 테스트 — TaskQueue 테스트(`08-01-unitest`), 모킹(`08-02-mock`: 기본/HTTP/코어 모듈/다른 모듈), 의존성 주입 방식(`08-03-DI`) |
| `09-integration-test/` | 통합 테스트 — DB 연동(`db/`), HTTP API(`http/`) |
| `10-e2e-test/` | Playwright 기반 e2e 테스트. `.github/workflows/playwright.yml`이 이 디렉토리의 스펙만 CI로 실행한다 |
| `11-exercise/` | 연습문제 4종 — 유틸 함수 단위 테스트, 비동기 재시도 함수, 온도 판별, 피자 주문 통합 테스트 |

챕터 루트의 `study.txt`에 SUT, AAA 패턴, 커버리지의 함정, 테스트 더블(stub/spy)
등 개념 정리 노트가 있다.
