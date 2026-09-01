# Node.js Design Patterns — 학습 저장소

「Node.js Design Patterns」 책을 따라가며 작성한 개인 학습 코드 저장소다. 프로덕션
백엔드 API가 아니라, 책의 각 장에서 다루는 개념(모듈 시스템, 콜백, 프로미스/async,
스트림, 생성/구조/행동 패턴, 테스트, 레시피, 확장성, 메시징)을 챕터별 독립 예제
스크립트로 재현하며 학습한 결과물이다.

모든 학습 코드는 `chapters/` 아래에 있고, 각 하위 디렉토리는 책의 장(chapter)에
대응한다.

## 디렉토리 구조

| 디렉토리 | 다루는 내용 |
|---|---|
| `chapters/chapter2_module` | CommonJS/ESM 모듈 시스템, 동적 import, JSON import |
| `chapters/chapter3_callback` | 콜백 패턴, 에러 우선 콜백, observer, priority 큐 |
| `chapters/chapter4_asyncCallback` | 비동기 제어 흐름 (webspider 예제로 순차/병렬/제한 병렬 비교) |
| `chapters/chapter5_promiseAsync` | Promise, async/await (별도 `package.json` 보유) |
| `chapters/chapter6_stream` | Readable/Writable/Transform 스트림, pipe, mux/demux, web stream |
| `chapters/chapter7_patterns` | 생성 패턴: factory, builder, revealing constructor, singleton |
| `chapters/chapter8_structural-patterns` | 구조 패턴: proxy, decorator, adapter |
| `chapters/chapter9_behavioral-patterns` | 행동 패턴: state, strategy, iterator, command, middleware |
| `chapters/chapter10_test` | 테스트 작성법 자체가 주제 — node:test 러너, 단위/통합/e2e(Playwright) 테스트 예제 |
| `chapters/chapter11_recipe` | 비동기 초기화, 배치/캐싱, 취소, CPU-bound 작업 레시피 |
| `chapters/chapter12_scalability` | cluster, 동적/피어투피어 로드밸런싱, Docker, k8s, gRPC |
| `chapters/chapter13_messaging-integration` | pub/sub, task distribution, request/reply (AMQP, ZeroMQ, Redis 등) |
| `chapters/jsBasic` | 책 범위 밖 — closure/class/function/promise 등 JS 기초 별도 복습 |

각 챕터 하위에는 보통 `NN-개념이름/` 형식의 번호 붙은 예제 폴더가 있다(예:
`chapter7_patterns/01-factory`). `exercise/` 폴더는 책 말미 연습문제 풀이이며, 그
안에 문제 정의를 적은 `idea.md`가 있는 경우가 있다. 챕터 루트에 `study.txt` 또는
`study.md`가 있으면 학습하며 정리한 개인 노트이며, 모든 챕터에 있는 것은 아니다.

## 실행 방법

- 대부분의 예제는 `.mjs` 단일 스크립트로, 해당 폴더에서 `node 파일명.mjs`로 바로
  실행 가능하다. 외부 의존성은 루트 `package.json`에 모여 있다.
- `chapter5_promiseAsync/`만 자체 `package.json`을 갖고 있다.
- `npm run lint` — ESLint(flat config, `eslint.config.js`)로 `chapters/` 전체를
  검사한다.
- `chapter10_test`의 단위/통합 테스트는 `node --test 경로/파일.test.mjs`로 실행한다.
- `chapter10_test/10-e2e-test`만 Playwright를 쓰며, `.github/workflows/playwright.yml`이
  push/PR 시 이 e2e 스펙만 CI로 실행한다.

## 더 자세한 안내

- 에이전트/AI 도구용 상세 가이드는 [`GEMINI.md`](./GEMINI.md) 참고 (알려진 제약,
  커밋 컨벤션 등).
- 이 저장소의 AI-readiness 감사 결과는 [`docs/ai-readiness-map.html`](./docs/ai-readiness-map.html)
  ([JSON](./docs/ai-readiness-score.json))에서 확인할 수 있다.
