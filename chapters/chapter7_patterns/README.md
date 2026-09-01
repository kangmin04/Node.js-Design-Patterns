# Chapter 7 — 생성 패턴 (Creational Patterns)

객체 생성 로직을 캡슐화하는 생성 패턴들: factory, builder, revealing
constructor, singleton.

| 디렉토리 | 내용 |
|---|---|
| `01-factory/` | factory 패턴 — 단순 factory, 동적 클래스 선택, 캡슐화(`03-factory-encapsulation.mjs`), profiler 예제. `factory-study.mjs`는 factory 적용 전/후를 대조하는 개념 설명용 코드(가상 클래스 참조, 실행 대상 아님) |
| `02-builder/` | builder 패턴 — 보트 조립(`01-boat`), URL 빌더(`02-url-builder`), 서드파티 라이브러리(superagent) 빌더 API 활용 |
| `03-revealing-constructor/` | revealing constructor 패턴 — 불변 Buffer(`immutableBuffer.mjs`) 예제 |
| `04-singleton/` | singleton 패턴과 그 함정 — 모듈 캐싱 기반 singleton, 의존성 주입으로 singleton 깨기 방지(`02-dependency-injection`), singleton을 깨는 예시(`breakSingleton.mjs`), DB 클래스(`database.mjs`)와 인스턴스 생성(`dbInstance.mjs`) 분리 |
| `exercise/` | `console-color-factory01`(색상 콘솔 로거 factory), `request-builder02`(HTTP 요청 빌더), `tamper-free-queue03`(외부에서 변경 불가능한 큐) |
