# Chapter 12 — 확장성과 아키텍처 패턴

단일 프로세스 확장(cluster)부터 다중 서버 로드밸런싱, 컨테이너화, 마이크로서비스
간 통신(gRPC)까지 애플리케이션을 수평으로 확장하는 방법을 다룬다.

| 디렉토리 | 내용 |
|---|---|
| `01-cluster/` | `cluster` 모듈 단계별 학습 — 기본 클러스터링(`01-basic`) → 워커 장애 복구(`02-resiliency`) → 무중단 재배포(`03-zeroDowntime`) → PM2 프로세스 매니저(`04-pm2`) → nginx 리버스 프록시(`05-nginx`) |
| `02-dynamic-load-balancer/` | 서비스 레지스트리(Consul)를 이용한 동적 로드밸런싱 |
| `03-p2p-loadBalancing/` | 중앙 로드밸런서 없이 클라이언트가 직접 서버를 선택하는 P2P 방식 |
| `04-docker/` | Docker로 애플리케이션 컨테이너화 (`Dockerfile`) |
| `06-grpc/` | gRPC로 마이크로서비스 간 통신 (API 게이트웨이 ↔ 주문 서비스, `.proto` 정의) |
| `exercise/02-z-axis/` | Z축 스케일링(데이터 샤딩) 연습 — 키 범위별 서비스 레지스트리와 로드밸런서 |

`docker-study.txt`, `k8s-study.txt`, `study-scalability.txt`에 Docker/Kubernetes
실행 절차와 개념 학습 노트가 있다.
