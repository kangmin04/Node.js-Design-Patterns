import { createServer } from "node:http";

// PM2가 클러스터링, 프로세스 관리, 재시작 등을 모두 처리하므로
// 애플리케이션 코드에는 순수한 서버 로직만 남습니다.

const server = createServer((req, res) => {
  // PM2의 자동 재시작(Resiliency) 기능을 테스트하기 위한 엔드포인트
  if (req.url === '/crash') {
    console.log(`Worker ${process.pid} is intentionally crashing!`);
    // 예기치 않은 오류를 시뮬레이션하여 프로세스를 종료합니다.
    process.exit(1);
  }

  // 어떤 워커가 요청을 처리했는지 확인하기 위해 PID를 응답합니다.
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`Response from updated worker ${process.pid}`); // test zero downtime deployment
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Worker ${process.pid} started and listening on port ${PORT}`);
});
