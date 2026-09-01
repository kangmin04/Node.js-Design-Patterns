# Chapter 13 — 메시징과 통합 패턴

서비스 간 비동기 통신 패턴을 다룬다: pub/sub, 작업 분배(competing consumer),
요청/응답(request/reply). 채팅 애플리케이션을 예제로 WebSocket → Redis →
ZeroMQ → AMQP → Redis Stream 순으로 기술 스택을 바꿔가며 pub/sub을 구현한다.

| 디렉토리 | 내용 |
|---|---|
| `01-06-pub-sub/` | pub/sub 채팅 구현 6단계 — WebSocket 직접 구현(01) → Redis pub/sub(02) → ZeroMQ(03) → AMQP/RabbitMQ, DLX 포함(04) → Redis Stream(05) → 사용자 구분까지 추가한 Redis Stream(06) |
| `07-task-distribution/` | 작업 분배 패턴(competing consumer) — 작업 생성/수집/처리 프로세스 분리, ZeroMQ 실험(`zeromq-test/`) |
| `08-request-reply/` | 요청/응답 패턴 — 자식 프로세스 채널 기반 요청자/응답자 |
| `09-request-reply-return-address/` | AMQP의 return address(회신 큐)를 이용한 요청/응답 패턴 |
| `exercise/` | `multi-chat-redis`(Redis 기반 멀티룸 채팅), `multi-chat-socket`(Socket.IO 기반 멀티룸 채팅, `public/`는 브라우저에서 로드되는 클라이언트 스크립트) |

챕터 루트의 `study.txt`에 학습 노트가 있다.
