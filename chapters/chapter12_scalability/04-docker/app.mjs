import { createServer } from "node:http";
import { hostname } from "node:os";

/* rollout test: prev는 1이었고, 무중단 배포 테스트!  */
const version = 2;


createServer((_req, res) => {
    res.end(`Hello from ${hostname()} (v${version})`)
}).listen(8080); 
