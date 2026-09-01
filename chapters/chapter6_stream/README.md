# Chapter 6 — 스트림

Node.js 스트림(Readable/Writable/Transform)의 동작 원리부터 pipe/pipeline,
스트림 조합, 포킹/병합, mux/demux, Web Streams API까지 번호 순서(01~12)로
난이도를 높여가며 다룬다.

| 디렉토리 | 내용 |
|---|---|
| `01-buffer/` | Buffer 방식 vs 스트림 방식 비교, gzip 압축 예제 |
| `02-readable-stream/` | Readable 스트림 — flow/non-flow 모드, async iterator로 소비, 커스텀 Readable 구현, gzip 송수신, CSV 유틸리티 |
| `03-writable-stream/` | Writable 스트림 — HTTP 엔트로피 서버, backpressure 처리, 파일로 쓰는 커스텀 Writable |
| `04-transform-stream/` | Transform 스트림 — 커스텀 변환, CSV 필터링, PassThrough로 관측(observability), 파일 업로드 |
| `05-pipe/` | `pipe()`/`pipeline()`로 스트림 연결 |
| `06-combined-streams/` | 여러 스트림을 하나로 조합(compose), 압축+암호화 아카이브 |
| `07-async-controlFlow/` | 스트림을 이용한 순차(01)/동시(02) 비동기 흐름 제어 |
| `08-forking-stream/` | 하나의 스트림을 여러 목적지로 분기(forking) |
| `09-merge-stream/` | 여러 스트림을 하나로 병합, `readline` 메모 |
| `10-mux-demux/` | 여러 스트림을 하나의 채널로 멀티플렉싱/디멀티플렉싱 |
| `11-web-stream/` | 표준 Web Streams API |
| `12-consumer/` | 스트림 소비자 측 패턴 (fetch 스트림 소비 등) |
| `exercise/` | 연습문제 4종 — 압축 효율 비교, CSV 데이터 가공(`data-processing-02`), TCP 파일 전송, 터미널 애니메이션(`parrot-live-04`) |
| `lazy-stream/` | 필요할 때까지 데이터 생성을 미루는 lazy 스트림 |
