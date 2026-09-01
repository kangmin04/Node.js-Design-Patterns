# Node.js Design Patterns 학습 저장소 안내

## 1. 이 저장소는 무엇인가

「Node.js Design Patterns」 책을 따라가며 작성한 개인 학습 코드 저장소다. 프로덕션
백엔드 API가 아니라, 책의 각 장에서 다루는 개념(모듈 시스템, 콜백, 프로미스/async,
스트림, 생성/구조/행동 패턴, 테스트, 레시피, 확장성, 메시징)을 챕터별 독립 예제
스크립트로 재현하며 학습한 결과물이다. `index.js`, `public/`은 이 저장소와 무관한
초기 스캐폴딩(Node/Express hello-world 템플릿) 잔재이며 학습 내용과 관계없다.

## 2. 디렉토리 구조

모든 학습 코드는 `chapters/` 아래에 있다. 각 하위 디렉토리는 책의 장(chapter)에
대응한다(1장은 코드 예제가 없어 없음).

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

각 챕터 하위에는 보통 `NN-개념이름/` 형식의 번호 붙은 예제 폴더가 있고(예:
`chapter7_patterns/01-factory`), 일부 챕터는 번호 없이 이름만 쓴 폴더도 섞여 있다
(`chapter9_behavioral-patterns/command-pattern`, `.../middleware`). `exercise/`
폴더는 책 말미 연습문제 풀이이며, 그 안에 문제 정의를 적은 `idea.md`가 있는 경우가
있다. 챕터 루트에 `study.txt` 또는 `study.md`가 있으면 그 챕터를 학습하며 정리한
개인 노트이며, 모든 챕터에 있는 것은 아니다.

## 3. 실행 방법

- 대부분의 예제는 `.mjs` 단일 스크립트로, 해당 폴더에서 `node 파일명.mjs`로 바로
  실행 가능하다. 외부 의존성은 루트 `package.json`에 모여 있다.
- `chapter5_promiseAsync/`만 자체 `package.json`/`package-lock.json`을 갖고 있다.
- `chapter10_test`의 단위/통합 테스트는 `node --test 경로/파일.test.mjs`로 실행한다
  (루트 `package.json`에 이를 한 번에 실행하는 스크립트는 아직 없음).
- `chapter10_test/10-e2e-test`만 Playwright를 쓰며, 자체 `playwright.config.ts`를
  가진다. `.github/workflows/playwright.yml`이 push/PR 시 이 e2e 스펙만 실행한다
  (다른 챕터는 CI 대상이 아님).
- `chapter12_scalability`의 Docker/k8s/nginx 예제는 각 하위 폴더의 study 노트
  (`docker-study.txt`, `k8s-study.txt`)에 실행 절차가 적혀 있다.

## 4. 알려진 제약

- 챕터 간 코드 재사용이나 import는 없다 — 각 예제 폴더는 서로 독립적인 스크립트다.
- 린트/포매터 설정이 없다. 커밋 메시지는 `Feat.`, `Review`, `Chore.` 접두사를
  느슨하게 관례로 쓰고 있으나 강제되지는 않는다(`git log` 참고).
- 학습 노트(`study.txt`/`study.md`)는 일부 챕터에만 있고 형식도 통일돼 있지 않다.
- 이 문서는 저장소 전체를 관리하는 CLAUDE.md 역할을 겸한다. AI 에이전트 관점에서
  이 저장소의 상세 감사 결과는 `docs/ai-readiness-map.html` / `docs/ai-readiness-score.json`
  (cartography 스킬 산출물)을 참고한다.
