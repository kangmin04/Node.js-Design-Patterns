# Chapter 2 — 모듈 시스템

CommonJS/ESM 모듈 시스템, 모듈 로딩 순서와 캐싱, 동적 import, JSON import,
revealing module 패턴을 다룬다.

| 디렉토리/파일 | 내용 |
|---|---|
| `dynamicImport/` | `import()` 동적 로딩 — 언어별 문자열 파일(`strings-*.js`)을 런타임에 선택 로드하는 i18n 예제 |
| `importingJson/` | JSON을 모듈로 가져오는 여러 방식 비교 (`main.mjs` ~ `main4.mjs`) |
| `loading/` | 모듈이 로드되는 순서와 캐싱 동작 확인 (`a.js`, `b.js`, `counter.js`) |
| `logger/` | 가장 단순한 형태의 로거 모듈 |
| `logger2/` | logger 모듈 확장 — 색상 적용(`colorizeLogger2.js`)과, ESM import 바인딩이 읽기 전용이라 재할당이 실패하는 것을 실험하는 `replaceLogger*.js` 3종 |
| `module1/` | 모듈 패턴 기초, revealing module 패턴(`revealing-module-pattern.js`) |
| `index.js` | 챕터 진입점 스크립트 |

`logger2/replaceLogger.js`, `replaceLogger2.js`는 의도적으로 "실패하는" 코드다 —
ESM 모듈의 import 바인딩이 불변임을 확인하기 위한 실험이므로 정상 동작하지 않는
것이 맞다.
