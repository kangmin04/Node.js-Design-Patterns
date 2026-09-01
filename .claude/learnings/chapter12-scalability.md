# Chapter 12 — 확장성 (Scalability)

## 개요
이 챕터는 "Node.js는 싱글 스레드인데 어떻게 멀티코어/여러 서버로 확장하는가"라는 하나의 질문을 여러 층위에서 답한다. `01-cluster`는 한 머신 안에서 `cluster` 모듈로 CPU 코어를 최대한 활용하는 법(X축 확장 · 수직적으로 보이지만 실제론 프로세스 복제), `02-dynamic-load-balancer`와 `03-p2p-loadBalancing`은 여러 머신/인스턴스로 요청을 분산하는 두 가지 철학(중앙 집중형 vs 클라이언트 자율형)을 다루고, `04-docker`는 그 인스턴스들을 어디서든 동일하게 실행 가능한 단위로 포장하는 법을, `06-grpc`는 마이크로서비스로 쪼개진 서비스들이 서로 빠르게 통신하는 법을 보여준다. `exercise/02-z-axis`는 X축(복제)이 아닌 Z축(데이터 파티셔닝/샤딩) 확장을 직접 구현해보는 연습이며, `k8s-study.txt`·`docker-study.txt`·`study-scalability.txt`는 각각 쿠버네티스, 도커 내부 동작, 확장성 이론(Scale Cube, stateful/stateless, JWT, 서비스 레지스트리, MSA 통합 패턴, 로깅/서킷브레이커) 전반을 다루는 개인 학습 메모다. 전체를 관통하는 흐름은 "프로세스 격리 → 네트워크 레벨 분산 → 컨테이너화 → 오케스트레이션 → 서비스 간 통신"으로, 결국 뒷부분에서 정리된 실전 아키텍처인 "Nginx/API Gateway → Kubernetes(오토스케일링) → gRPC(P2P 내부 통신)" 흐름으로 수렴한다.

### 개념 1: Scale Cube — 확장성의 세 가지 축 (`study-scalability.txt` 1~30줄)
- **X축 확장(Cloning)**: 동일 애플리케이션을 여러 인스턴스로 복제하고 앞에 로드밸런서를 둠. 구현이 가장 쉽고 즉각적이지만, DB 자체가 병목이면 한계가 있음.
- **Y축 확장(Decomposing)**: 기능별로 서비스를 쪼갬(MSA의 핵심). 특정 기능(결제 등)에만 트래픽이 몰릴 때 그 서비스만 확장 가능.
- **Z축 확장(Data Partitioning)**: 인스턴스마다 담당 데이터 범위를 나눔(샤딩). `exercise/02-z-axis`가 바로 이 축을 실습한 것 — 사용자 이름 앞글자 기준(A-D/E-P/Q-Z)으로 데이터를 3개 인스턴스에 분산 저장.
- **Node.js와의 연결**: JS 실행이 싱글 스레드이므로 멀티코어 활용에는 필연적으로 멀티프로세스(X축)가 필요하고, 이 전제가 개발자를 자연스럽게 무상태(stateless) 설계로 이끈다는 것이 저장소 메모의 핵심 통찰.

### 개념 2: Node.js Cluster 모듈 — 프로세스 기반 X축 확장 (`01-cluster/`)
Node.js는 스레드 간 메모리 공유로 인한 경쟁 상태를 피하기 위해 메모리를 격리한 멀티프로세스 모델을 택했다. `cluster` 모듈은 내부적으로 `child_process.fork()`를 사용하되, 여러 워커가 **같은 포트를 공유하는 것처럼** 보이게 만든다 — 실제로는 워커가 `listen()`을 호출하면 Primary 프로세스에 위임하고, Primary가 포트를 잡은 채 라운드 로빈으로 연결을 워커에 분배한다.

**01-basic**: 가장 단순한 형태.
```js
// 01-cluster/01-basic/basic.mjs:7-19
if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    for (let i = 0; i < numCPUs - 1; i++) {
        cluster.fork();
    }
} else {
    console.log(`Worker ${process.pid} started`);
}
```
`if(cluster.isPrimary){ fork() } else { doOtherWork() }` 패턴 자체가 멀티 인스턴스 실행의 기본 골격이라는 게 메모에 남긴 정리다. `app.mjs`(01-basic)는 여기에 실제 HTTP 서버와 **IPC(`worker.send`/`process.on('message')`)** 예제를 추가로 보여준다. 메모에는 IPC의 비용까지 분석되어 있다 — 데이터를 직렬화 → 커널을 통한 프로세스 간 전달 → 역직렬화 과정을 거치므로, 만약 Primary가 N개 워커 모두에게 브로드캐스트한다면 N번의 직렬화/역직렬화가 필요해 병목이 될 수 있다. 그래서 프로세스 간 "상태 공유"에는 IPC 대신 Redis 같은 외부 저장소가 합리적이라는 결론.

**02-resiliency**: 워커가 죽으면 자동으로 대체 워커를 생성해 회복탄력성을 확보.
```js
// 01-cluster/02-resiliency/app.mjs:12-17
cluster.on('exit', (worker, code) => {
    if(code !== 0 && !worker.exitedAfterDisconnect){
        console.log(`Worker ${worker.process.pid} died with code ${code}. Starting A New Server`)
        cluster.fork()
    }
})
```
`worker.exitedAfterDisconnect`가 핵심 플래그 — `worker.kill()`/`disconnect()`로 **의도된** 종료면 `true`, 에러로 죽으면 `false`가 되어 이 조건으로 "의도치 않은 죽음"만 재생성 대상으로 구분한다. 이는 워커가 독립 프로세스라 격리된 메모리 안에서만 문제가 발생하고 다른 워커는 영향받지 않기 때문에 가능한 패턴 — 만약 스레드 기반이었다면 한 스레드의 오류가 공유 메모리를 오염시켜 전체가 멈췄을 것이라는 게 메모의 비교 포인트.

**03-zeroDowntime**: `SIGUSR2` 시그널을 받아 워커를 하나씩 안전하게 재시작하는 무중단 배포 로직.
```js
// 01-cluster/03-zeroDowntime/app.mjs:21-41
process.on("SIGUSR2", async () => {
    const workers = Object.values(cluster.workers);
    for (const worker of workers){
        worker.disconnect(); // graceful stop: 새 연결 거부, 기존 작업 완료 대기
        const killTimeout = setTimeout(() => {
            if (!worker.isDead()) worker.kill();  // 2초 내 안 죽으면 강제 종료
        }, 2000);
        await once(worker, 'exit');
        if(!worker.exitedAfterDisconnect) continue
        const newWorker = cluster.fork();
        await once(newWorker, 'listening')  // 새 워커가 완전히 준비될 때까지 대기 후 다음 순회
    }
})
```
`kill -SIGUSR2 <PID>`로 신호를 보내면 워커들을 **순차적으로**(동시에 아님) `disconnect()` → 대기 → 강제 kill 타임아웃 → 새 워커 fork → `listening` 이벤트 대기 순으로 롤링 교체한다. 한 번에 하나씩 처리하므로 항상 최소 (코어수-1)개의 워커가 살아있어 무중단이 유지된다. 메모에는 `SIGKILL`(강제, 거부불가) / `SIGTERM`(정중한 종료 기본값) / `SIGUSR2`(사용자 정의, 개발자가 의미 부여) / `SIGINT`(Ctrl+C)의 차이도 정리되어 있다.

**04-pm2**: cluster 모듈을 직접 관리하는 대신 **PM2** 프로세스 매니저에 위임. `app.mjs`는 순수 서버 로직만 남고(`/crash` 엔드포인트로 강제 종료 테스트), `pm2 start app.mjs -i max`로 실행하면 PM2가 내부적으로 cluster를 사용해 CPU 코어 수만큼 프로세스를 복제·로드밸런싱·자동 재시작까지 처리한다. `pm2 reload all`은 무중단 롤링 업데이트를 대신 해준다. PM2 최초 실행 시 `God Daemon`이 백그라운드에 떠서 자식 프로세스들을 생성·감시하며, `pm2 monit`/`logs`는 이 데몬에게 상태를 물어보는 것이라는 점도 메모에 정리됨. **fork 모드**(단일 프로세스, 메모리 적지만 CPU 병목에 취약해 Event Loop Latency 높음) vs **cluster 모드**(메모리 더 쓰지만 Latency 낮음, 프로세스 간 데이터 공유엔 Redis 필요)의 트레이드오프도 기록되어 있다.

**05-nginx**: Node.js 프로세스 자체는 단일 포트만 리스닝하도록 하고(`PORT` 환경변수/CLI 인자로 여러 포트에 여러 인스턴스 실행), 앞단에 **Nginx**를 리버스 프록시 겸 로드밸런서로 둠.
```nginx
# 01-cluster/05-nginx/nginx.conf:15-23
upstream my-load-balanced-app {
    server 127.0.0.1:8081 weight=3;
    server 127.0.0.1:8082;
    server 127.0.0.1:8083;
    server 127.0.0.1:8084;
}
server {
    listen 8080;
    location / { proxy_pass http://my-load-balanced-app; }
}
```
메모의 핵심 결론: **cluster 모듈은 단일 서버 내 멀티코어 활용(수직적으로 보이는 확장)**, **리버스 프록시는 여러 서버(머신) 간 트래픽 분산(진짜 수평 확장)**으로 스코프가 다르며, 실무에서는 경쟁 관계가 아니라 계층으로 함께 쓴다 — `사용자 → Nginx(여러 서버로 분산) → 각 서버의 Primary(cluster로 코어별 워커에 분산)`. 다만 메모는 이 구성이 다소 과거 방식이며, 요즘은 Nginx 뒤에 Kubernetes 같은 컨테이너 오케스트레이터를 두는 것이 표준이라고 덧붙인다. nginx 실행 시 로그 경로 문제(`-p ${PWD} -c ${PWD}/nginx.conf`로 홈 디렉토리를 명시해야 로그 파일 경로가 프로젝트 폴더 기준으로 해석됨)도 트러블슈팅 메모로 남아있다.

### 개념 3: 동적 로드밸런싱과 서비스 레지스트리 — Consul (`02-dynamic-load-balancer/`)
오토스케일링 환경에서는 서버 IP/포트가 계속 바뀌므로 로드밸런서 설정에 주소를 수동으로 적어둘 수 없다. **서비스 레지스트리**는 이를 해결하는 "자동 갱신 주소록"으로, 요청 경로에 직접 관여하지 않고 "어디로 보내야 하나요?"라는 질문에 답만 해주는 역할이다. 핵심 동작 3단계: ① 서비스 등록(인스턴스가 스스로 이름/IP/포트를 등록) ② 서비스 탐색(로드밸런서가 가용 인스턴스 목록을 질의) ③ 헬스 체크(비정상 인스턴스를 자동 제외).

```js
// 02-dynamic-load-balancer/app.mjs:18-28
async function registerService() {
  await consulClient.registerService({
    id: serviceId, name: serviceType, address, port, tags: [serviceType],
  })
}
// 프로세스 종료/예외 시 반드시 등록 해제 (uncaughtException, SIGINT 모두 훅)
process.on('uncaughtException', unregisterService)
process.on('SIGINT', unregisterService)
```
```js
// 02-dynamic-load-balancer/loadbalancer.mjs:20-39
const server = createServer(async (req, res) => {
    const route = routing.find(route => req.url.startsWith(route.path))
    const services = await consulClient.getAllServices();
    const servers = Object.values(services).filter(service => service.Tags.includes(route.service))
    if(servers.length > 0){
        route.index = (route.index + 1) % servers.length;  // 라운드 로빈
        const target = `http://${servers[route.index].Address}:${servers[route.index].Port}`
        proxy.web(req, res, {target})
        return;
    }
    res.writeHead(502); return res.end('Bad gateway')  // 가용 서버 없으면 502
})
```
`ConsulClient`(`consul.mjs`)는 Consul의 HTTP API(`/v1/agent/service/register`, `/deregister`, `/agent/services`)를 감싼 얇은 래퍼다. `exercise/02-z-axis/service-registry/consul.mjs`에서는 여기에 **헬스 체크**가 추가된다.
```js
// exercise/02-z-axis/service-registry/consul.mjs:21-27
Check : {
  HTTP: `http://${address}:${port}/health`,
  Interval: "10s", Timeout: "3s",
  DeregisterCriticalServiceAfter: "30s"
}
```
Consul은 `/health` 응답 코드로 상태를 판정한다(2xx=정상, 429=경고, 그 외=Critical). Critical 상태가 `DeregisterCriticalServiceAfter` 시간(예: 30초) 이상 지속되면 레지스트리에서 완전히 삭제되어, 관리자 개입 없이 자가 치유(Self-Healing)가 이루어진다. Consul을 쓰는 이유로 메모는 `portFinder`로 여러 포트를 잡아 여러 프로세스를 띄우는 것 자체가 "멀티 프로세스"이며 각각 독립된 메모리를 가지므로 하나가 죽어도 다른 인스턴스는 영향받지 않는다는 회복탄력성을 짚는다. 실무에서는 Kubernetes가 Consul의 서비스 디스커버리/헬스체크/로드밸런싱 기능을 대체하는 경우가 많다는 메모도 있다.

### 개념 4: P2P 로드밸런싱 — 클라이언트 측 분산 (`03-p2p-loadBalancing/`)
중앙 로드밸런서 없이 **클라이언트가 직접** 여러 서버 중 하나를 골라 연결하는 방식(Client Side Discovery).
```js
// 03-p2p-loadBalancing/balancedRequest.mjs:1-13
const servers = [
    { host: 'localhost', port: 8081 },
    { host: 'localhost', port: 8082 },
]
let i = 0
export function balancedRequest(url, fetchOptions = {}) {
    i = (i+1) % servers.length;
    const server = servers[i];
    const rewrittenUrl = new URL(url, `http://${server.host}:${server.port}`);
    rewrittenUrl.host = `${server.host}:${server.port}`;
    return fetch(rewrittenUrl.toString(), fetchOptions);
}
```
`client.mjs`는 이 함수를 10회 호출해 라운드 로빈으로 두 서버(`app.mjs`, PID를 응답에 포함)에 요청이 번갈아 가는 것을 확인한다. 이 기본 구현의 문제는 서버 목록이 하드코딩되어 있어 ① 서버 추가/제거 시 모든 클라이언트 코드를 수정·재배포해야 하고 ② 장애 감지가 없어 죽은 서버로도 계속 요청을 보낸다는 점(→ 실무에서는 이 정적 목록 대신 서비스 레지스트리 조회로 대체하는 것이 자연스러운 다음 단계).

**P2P vs 중앙 집중식(리버스 프록시) 비교**(메모 정리):
| | P2P | 중앙 집중식(Nginx/ELB) |
|---|---|---|
| 지연시간 | 낮음(홉 감소) | 로드밸런서 경유로 약간 추가 |
| 인프라 비용 | 로드밸런서 불필요 | 별도 인프라·고가용성 구성 필요 |
| SPOF | 없음 | 로드밸런서 자체가 SPOF 가능성 |
| 클라이언트 복잡도 | 높음(로직 분산) | 낮음(주소만 알면 됨) |
| 주요 사용처 | MSA **내부** 서비스 간 통신 | **외부** 인터넷 트래픽의 단일 진입점 |

이 P2P 패턴은 뒤의 gRPC 예제에서 `round_robin` 로드밸런싱 설정으로 다시 등장한다 — 쿠버네티스 DNS가 여러 Pod IP를 반환하면 gRPC 클라이언트가 중간 로드밸런서 없이 스스로 라운드 로빈으로 분산 발송한다.

### 개념 5: Docker 컨테이너화 (`04-docker/`, `docker-study.txt` 통합)
`04-docker/app.mjs`는 무중단 배포(rolling update) 테스트용 최소 서버로, `version` 상수만 바꿔가며 v1→v2 재배포 시나리오를 검증하는 데 쓰인다.
```js
// 04-docker/app.mjs:5-10
const version = 2;
createServer((_req, res) => {
    res.end(`Hello from ${hostname()} (v${version})`)
}).listen(8080);
```
```dockerfile
# 04-docker/Dockerfile:1-13
FROM node:20-slim
EXPOSE 8080
COPY app.mjs package.json /app/
WORKDIR /app
CMD ["npm", "start"]
```
메모에서 짚은 핵심은 **레이어 캐싱**이다: `package.json`을 소스 코드보다 먼저 `COPY`하면, 의존성이 바뀌지 않는 한 `npm install` 레이어가 캐시에서 재사용되어 코드 수정만으로는 매번 무거운 설치를 다시 하지 않는다(이 Dockerfile 자체는 `COPY app.mjs package.json /app/`으로 한 번에 복사하지만, `docker-study.txt`에는 더 최적화된 2단계 COPY 패턴이 별도로 정리되어 있다).

**컨테이너 vs VM (커널 공유의 의미)**: VM은 각자 독립된 게스트 OS 커널을 가져(완벽 격리, 무겁고 느림) 부팅에 수 분이 걸리지만, 도커는 호스트 OS 커널 하나를 공유하면서 **네임스페이스**(가상 칸막이 — 컨테이너가 다른 프로세스를 못 보게 함)와 **cgroups**(CPU/메모리 자원 할당량 제한)로 격리해 이미지가 수십~수백 MB, 실행이 수 초로 매우 가볍다. 컨테이너도 결국 호스트의 user space에서 도는 하나의 프로세스일 뿐이며, 컨테이너 안에서 `ps`를 치면 네임스페이스 덕에 자기 자신만 보인다는 점이 메모의 핵심 통찰.

**가상화 기술의 4세대 역사**(메모 요약): ① 물리 서버 시대의 "제 컴퓨터에서는 되는데요" 의존성 지옥 → ② VM의 무거운 완벽 격리 → ③ Docker의 가벼운 커널 공유형 격리("Build once, run anywhere") → ④ 컨테이너 수가 폭증하며 등장한 오케스트레이션(Kubernetes)의 시대.

**Docker 객체**: 이미지(읽기 전용 템플릿, 여러 레이어의 중첩), 컨테이너(이미지를 실행한 프로세스 인스턴스, 실행 중 변경사항은 쓰기 가능한 컨테이너 레이어에 저장되며 삭제 시 함께 사라짐 → 영구 저장은 별도 볼륨 필요). `docker build .`는 현재 디렉토리를 빌드 컨텍스트로 tar 압축해 Docker 데몬에 전송한 뒤 Dockerfile 명령을 한 줄씩 실행한다. `docker run -it -p 8080:8080 <image>`의 `-p`(포트 매핑)가 없으면 컨테이너는 격리된 가상 네트워크 안에만 존재해 호스트에서 접근할 수 없다.

**Docker Compose**: 웹서버·DB·캐시처럼 여러 컨테이너를 개별 `docker run`으로 띄우고 네트워크까지 수동 연결하는 번거로움을 `docker-compose.yml` 선언 하나로 해결한다. `docker-compose up`은 ① yml 파싱 ② 프로젝트 전용 가상 네트워크 자동 생성(서비스 이름이 곧 호스트 이름이 되어 `host: 'db'`처럼 접근 가능 — 아파트 단지 자동 인터폰에 비유) ③ 볼륨 생성 ④ 이미지 빌드/pull ⑵ ⑤ `depends_on` 순서를 지켜 컨테이너 실행 ⑥ 로그 스트리밍을 순차 수행하고, `down`은 컨테이너·네트워크만 정리하며 **볼륨은 기본적으로 보존**한다(완전 삭제는 `-v` 필요). 보안 강화를 위해 frontend/backend 네트워크를 분리해 `proxy`만 외부와 통신하고 `database`는 backend 전용으로 격리하는 사용자 정의 네트워크 패턴도 정리되어 있다.

**볼륨 vs 바인드 마운트**: 볼륨(Docker가 관리, 이식성·안전성 높음 → DB 데이터/업로드 파일 등 프로덕션 영구 데이터에 권장)과 바인드 마운트(호스트 경로를 1:1로 직접 연결, 실시간 동기화 → 소스 코드 핫리로드 등 개발 환경에 적합)를 구분해서 써야 한다는 것이 결론.

### 개념 6: Kubernetes (`k8s-study.txt` 통합)
쿠버네티스는 **선언적(declarative) 구성 모델**이 핵심이다 — "3개의 복제본이 떠 있어야 한다"고 원하는 최종 상태(Desired State)만 선언하면, 쿠버네티스가 현재 상태(Current State)와 끊임없이 비교하는 컨트롤 루프를 돌며 하나가 죽으면 자동으로 새로 띄운다. 로컬 실습 도구는 `kubectl`(배포·조회·로그 관리)과 `minikube`(로컬 단일 노드 클러스터).

주요 명령과 내부 동작(메모 정리):
- **`kubectl create deployment`**: 가장 작은 배포 단위는 **Pod**. 직접 컨테이너를 띄우면 죽었을 때 아무도 되살리지 않으므로, **Deployment**(관리자)가 뒤에서 **ReplicaSet**(복제본 제어기)을 생성하고 ReplicaSet이 실제 Pod를 생성·유지한다.
- **`kubectl get deployments/pods`**: Desired State와 Current State의 불일치(예: `ErrImagePull`)를 사용자에게 리포트하는 모니터링 명령.
- **`kubectl scale --replicas=5`**: 전통적 Scale-up(서버 사양 업그레이드) 대신 **Scale-out**(동일 스펙 Pod를 옆으로 더 띄움)을 취한다 — Node.js 디자인 패턴의 "싱글 스레드 프로세스를 여러 개 띄워 확장"이라는 철학의 인프라 버전이라는 게 메모의 통찰. 명령을 받으면 ReplicaSet이 즉시 부족한 Pod를 추가 생성한다.
- **`kubectl expose deployment ... --type=LoadBalancer`**: Pod는 스케일링/재시작 때마다 내부 IP가 랜덤하게 바뀌므로, 클라이언트가 참조할 **고정 주소(Service)**가 필요하다. Service는 라벨 셀렉터(`app=hello-web`)로 여러 Pod를 하나로 묶고, 들어오는 요청을 라운드 로빈으로 분산한다.
- **`kubectl set image` + rollout**: 무중단 롤링 업데이트. 한 번에 다 끄지 않고 "새 버전 하나 켜고 → 구버전 하나 끄고"를 반복해 서비스 중단 없이 v1 Pod들을 v2로 점진 교체한다 — `01-cluster/03-zeroDowntime`의 `SIGUSR2` 롤링 재시작 로직과 동일한 아이디어가 인프라 레벨로 확장된 형태다.

`study-scalability.txt`는 여기에 덧붙여 "리버스 프록시 + 각 서버별 cluster 모듈" 구성이 다소 과거 방식이며, 현재는 Nginx/API Gateway 앞단 + Kubernetes 오케스트레이션이 표준이라고 정리한다.

### 개념 7: gRPC를 통한 마이크로서비스 간 통신 (`06-grpc/`)
MSA에서는 서비스마다 전용 DB를 가지므로(data ownership), 주문 서비스가 결제 서비스의 코드를 로컬에 복사해 호출할 수 없다 — DB/메모리 등 격리된 자원에 접근할 방법이 없기 때문에 반드시 네트워크를 통해 원격 서비스에 일을 시켜야 한다. REST(JSON over HTTP/1.1)도 가능하지만 gRPC를 쓰는 이유는 메모에 세 가지로 정리되어 있다: ① `.proto`의 IDL(Interface Definition Language)로 타입을 강제해 데이터 불일치를 컴파일/실행 직전에 차단, ② Protocol Buffers(바이너리 직렬화) + HTTP/2 멀티플렉싱으로 REST 대비 수 배~수십 배 빠르고 CPU 적게 사용, ③ 네트워크 통신을 은닉해 로컬 함수를 호출하는 듯한 개발자 경험 제공.

```proto
// 06-grpc/order.proto:1-19
syntax = "proto3";
package order;
service OrderService {
  rpc CreateOrder (OrderRequest) returns (OrderResponse);
}
message OrderRequest {
  string item = 1;
  int32 quantity = 2;
}
message OrderResponse {
  string message = 1;
  string processed_by = 2;
}
```
필드 뒤의 숫자(`= 1`, `= 2`)는 필드 태그로, gRPC가 `item: "노트북"` 같은 텍스트가 아니라 "1번 필드는 문자열 값"이라는 식으로 이진 인코딩하기 때문에 JSON보다 훨씬 압축된다.

```js
// 06-grpc/order-service.mjs:15-42 (서버)
function createOrder(call, callback) {
  callback(null, {
    message: `${call.request.item} ${call.request.quantity}개 주문이 성공적으로 처리되었습니다!)`,
    processed_by: "내 로컬 gRPC 서버 프로세스"
  });
}
const server = new grpc.Server();
server.addService(orderProto.OrderService.service, { createOrder });
server.bindAsync('127.0.0.1:50051', grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) { console.error(...); return; }
  console.log(`gRPC 전용 서버 구동 완료 (Port: ${port})`);
});
```
```js
// 06-grpc/api-gateway.mjs:19-32 (클라이언트/API 게이트웨이)
const client = new orderProto.OrderService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);
app.get('/order-test', (req, res) => {
  client.CreateOrder({ item: '맥북', quantity: 2 }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(response);
  });
});
```
`api-gateway.mjs`는 외부에서 오는 일반 HTTP(Express) 요청을 받아 내부적으로는 gRPC 스텁(`client`)을 로컬 함수처럼 호출해 `order-service.mjs`(포트 50051)와 통신한다 — 즉 **외부는 HTTP, 내부는 gRPC**라는 전형적인 API 게이트웨이 패턴. `study-scalability.txt`의 확장 예시에서는 이 연결 문자열이 `'dns:///order-service-internal:50051'`처럼 쿠버네티스 내부 DNS를 가리키고, `grpc.service_config`에 `loadBalancingConfig: [{ round_robin: {} }]`를 지정해 여러 Pod IP 중 하나를 gRPC 클라이언트 자신이 라운드 로빈으로 골라 요청하는 **P2P 로드밸런싱**으로 자연스럽게 이어진다는 것도 메모에 남아 있다.

메모가 정리한 MSA 전체 요청 흐름: ① Nginx/API Gateway가 외부 요청의 단일 진입점 역할(내부 구조 은닉) → ② Kubernetes가 트래픽에 따라 Pod 수를 자동 조절하고 분산 → ③ 서비스 간 내부 통신은 gRPC로 초고속 처리, 이때 P2P 로드밸런싱이 함께 작동.

### 개념 8: Z축 확장(데이터 파티셔닝) 실습 (`exercise/02-z-axis/`)
"주어진 알파벳으로 시작하는 사람 이름 목록을 가져오되, 하나의 공개 API 뒤에서 3개의 데이터 파티션(A-D, E-P, Q-Z)으로 나뉜 인스턴스가 각자의 범위만 담당한다"는 Z축 확장 연습. `fakeDataMaker.mjs`는 `@faker-js/faker`로 가짜 사용자를 생성해 첫 글자 기준으로 세 그룹으로 나눠 `AtoD.json`/`EtoP.json`/`QtoZ.json`에 저장한다.

**1차 구현(정적 라우팅, `index.mjs` + `load-balancer.mjs`)**: 로드밸런서가 요청 URL의 마지막 글자를 정규식으로 판별해 포트를 하드코딩 매핑한다.
```js
// exercise/02-z-axis/load-balancer.mjs:13-22
function selectServerByLetter(letter){
    if(/[a-d]/i.test(letter)) return instanceServer.AtoD
    if(/[e-p]/i.test(letter)) return instanceServer.EtoP
    return instanceServer.QtoZ
}
```
각 인스턴스(`index.mjs`)는 `process.argv`로 받은 자신의 포트에 따라 담당 JSON 파일만 메모리에 올려 필터링한다 — 정적 목록 방식이라 03-p2p와 동일한 한계(포트 하드코딩)를 갖는다.

**2차 구현(`service-registry/` 하위, Consul + 헬스체크 + winston 로깅으로 고도화)**: 정적 포트 매핑을 버리고 `02-dynamic-load-balancer` 패턴을 그대로 적용해, 각 파티션 인스턴스가 `A-D`/`E-P`/`Q-Z` 태그로 Consul에 스스로 등록하고(`app.mjs`), 로드밸런서(`load-balancer.mjs`)는 Consul에 질의해 해당 그룹 태그를 가진 인스턴스를 찾아 프록시한다.
```js
// exercise/02-z-axis/service-registry/load-balancer.mjs:61-77
const services = await consul.getAllServices();
if (services.length === 0) {
    throw new Error(`No healthy instances found for service group: ${group}`);
}
const group = selectGroupByLetter(letter);
const server = Object.values(services).find(service => service.Tags.includes(group))
if (server.Port === port) {
    // 로드밸런서가 자기 자신에게 프록시하는 무한루프 오설정을 방지하는 안전장치
    logger.error(`CRITICAL: Infinite loop detected!...`);
    res.writeHead(500); return res.end(...);
}
proxy.web(req,res,{target: `http://${server.Address}:${server.Port}`})
```
여기서 두 가지가 눈에 띄는 실무형 보강이다. 첫째, `proxy.on('error', ...)` 핸들러를 반드시 등록해야 백엔드 연결 실패 시 로드밸런서 프로세스 자체가 죽는 것을 막을 수 있다는 주석. 둘째, 응답 시간·요청 URL·에러를 `winston`(`logger.mjs`)으로 구조화 로깅한다 — `req`/`res` 객체를 그대로 로깅하면 순환 참조(`req.socket`이 `req`를 다시 참조하는 등) 때문에 `Converting circular structure to JSON` 에러가 나므로, 필요한 필드(`method`, `url`, `ip` 등)만 뽑아 로깅해야 한다는 트러블슈팅도 `study-scalability.txt` 후반부에 정리되어 있다.

### 그 외 `study-scalability.txt` 심화 이론 통합
- **Stateful vs Stateless 서버**: 상태를 서버 자신의 메모리에 두면(Stateful) 인스턴스마다 값이 달라져 로드밸런싱 시 일관성이 깨지고, 서버가 죽으면 상태가 소실된다. Stateless 서버는 Redis 같은 외부 공유 저장소에 상태를 위임해 어떤 인스턴스가 처리하든 동일한 결과를 보장하며, 수백 대로 늘려도 문제없다 — Node.js 확장 아키텍처의 기본 전제.
- **Sticky Load Balancing**: 리팩터링이 어려운 레거시 Stateful 앱을 위한 임시방편. 로드밸런서가 쿠키(`Set-Cookie: SERVERID=...`)나 클라이언트 IP 해시로 같은 사용자를 항상 같은 서버로 고정한다. 장점은 코드 수정 없이 다중 서버 운용 가능하다는 것, 단점은 부하 불균형과 해당 서버 다운 시 세션 완전 소실, 동적 스케일링의 복잡화.
- **JWT 기반 인증**: 세션 방식("서버가 장부를 보관")과 달리 서버가 상태를 전혀 저장하지 않고(Stateless) 클라이언트가 서명된 토큰 자체를 들고 다닌다. Header.Payload.Signature 구조에서 Signature가 위조 방지의 핵심(비밀 키 없이는 재서명 불가). 탈취 대응은 짧은 만료시간 + 리프레시 토큰 패턴 + HTTPS 필수 + (선택) Redis 기반 토큰 폐기 목록.
- **Socket.IO와 Sticky Session**: WebSocket 같은 상태 기반 연결은 로드밸런서가 요청마다 다른 서버로 보내면 끊긴다. Sticky Session으로 "연결 자체"를 고정하고, `socket.io-redis` 어댑터의 Pub/Sub으로 서버 간 "메시지"를 공유해야 진짜 확장 가능한 실시간 앱이 된다.
- **Forward Proxy vs Reverse Proxy**: Forward는 클라이언트를 위해 클라이언트를 숨기고(내부망 캐싱/접근제어), Reverse는 서버를 위해 서버를 숨긴다(로드밸런싱/SSL termination/정적 파일 서빙 — Node.js 앞의 Nginx가 이 역할).
- **MSA 통합 패턴 3종**: ① API Proxy(단순 중계, 의미 없는 구조적 통합) ② API Orchestration(오케스트레이션 레이어가 여러 서비스 호출을 조합하는 의미론적 통합 — 장점은 흐름이 명확해 설계/디버깅/확장이 쉽지만, 오케스트레이터가 God Object화되어 high coupling에 빠질 위험) ③ Messaging Pattern(Pub/Sub 브로커를 통한 이벤트 기반 완전 디커플링 — 새 구독자를 추가해도 발행자 코드는 안 바뀜). 프론트엔드별로 요구사항이 다르면 BFF(Backend for Frontend) 패턴도 고려.
- **API Orchestrator의 실전 보강**: 로깅(winston, 성공/실패 요청 모두 응답시간과 함께 기록)과 **서킷 브레이커(opossum)**. Consul 헬스체크는 "영구 장애"를 감지해 서비스를 파괴/재등록하는 데 강하지만, 서킷 브레이커는 일시적 지연/과부하까지 감지해 임계치 초과 시 즉시 실패시킴으로써 호출 측 리소스를 보호하고(Cascading Failure 방지) 일정 시간 뒤 재시도해 성공하면 CLOSED로 복귀한다 — 서킷 브레이커는 서비스 자신이 아니라 **호출하는 쪽(API 오케스트레이터/로드밸런서)**에 구현해야 한다는 점이 메모의 결론.
- **Monolithic vs Microservice**: 모놀리식이라고 모듈화가 없는 게 아니다(리눅스 Monolithic 커널도 내부 모듈화됨). 핵심 차이는 "같은 코드베이스·같은 프로세스로 배포되는가"이며, MSA의 핵심 특징은 서비스마다 전용 DB를 갖는 data ownership이다.
- **CPU/Core/Process 관계**: 코어 하나는 여러 프로세스를 빠르게 전환하며 동시성(Concurrency)을 만들고, 코어가 여러 개면 진짜 병렬성(Parallelism)이 생긴다. `pm2 start -i max`는 코어 수만큼 프로세스를 만들어 병렬성을 극대화하는 명령.
- **Daemon**: 터미널 세션에 종속되지 않고 백그라운드에서 독립 실행되는 프로세스. `node app.mjs`로 직접 실행하면 터미널의 자식이 되어 터미널 종료 시 함께 죽지만, 데몬화(복제 → 부모 즉시 종료 → 자식이 PID 1에 입양)를 거치면 독립적으로 계속 실행된다. PM2의 God Daemon, Nginx 데몬이 이 원리로 프로젝트와 무관하게 시스템 전역에서 동작한다.

## 실무 체크리스트 / 언제 이 노트를 다시 찾아봐야 하는가
- Node.js 앱을 멀티코어에서 돌려야 할 때: `cluster` 모듈을 직접 구현할지, PM2(`-i max`)에 위임할지 결정 기준을 확인하려면 → `01-cluster` 섹션.
- 무중단 배포/롤링 재시작 로직(`SIGUSR2`, `worker.disconnect()`, `exitedAfterDisconnect`)을 다시 구현해야 할 때 → `01-cluster/03-zeroDowntime`.
- 오토스케일링 환경에서 인스턴스 주소가 계속 바뀌는 문제를 서비스 레지스트리/헬스체크로 풀어야 할 때 → `02-dynamic-load-balancer`, `exercise/02-z-axis/service-registry`의 Consul 헬스체크 설정.
- 마이크로서비스 간 통신 방식(REST vs gRPC vs P2P vs 중앙 로드밸런서)을 선택해야 할 때 → `03-p2p-loadBalancing`, `06-grpc` 비교표.
- Dockerfile 레이어 캐싱, 볼륨 vs 바인드 마운트, Compose 네트워크 분리 같은 컨테이너화 세부사항이 헷갈릴 때 → `docker-study.txt` 통합 섹션.
- 쿠버네티스 Deployment/ReplicaSet/Service/Rollout의 역할 구분이 헷갈릴 때 → `k8s-study.txt` 통합 섹션.
- Stateful/Stateless 설계, 세션 vs JWT, sticky session 필요 여부를 판단해야 할 때, 혹은 순환참조 로깅 에러(`Converting circular structure to JSON`)를 다시 마주쳤을 때 → 심화 이론 통합 섹션.
