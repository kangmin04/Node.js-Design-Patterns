import cluster from "cluster";
import { cpus } from "os";
import process from "process";

const numCPUs = cpus().length;

if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);

    /* cluster.fork는 Non-blocking작업. 루프 돌면서 생성 요청을 빠르게 날리고, 워커들은 그 요청에 따라 독립적으로 생성되고 실행됨/ 
       Worker 프로세스는 운영체제가 요청을 받고 새로운 워커 프로세스 생성하며, 워커 프로세스는 코드를 처음부터 다시 실행함. else문실행. 
       결과적으로 거의 동시에 병렬로 메인과 워커가 작동한다. 
    */
    for (let i = 0; i < numCPUs - 1; i++) {
        cluster.fork();
    }
} else {
    console.log(`Worker ${process.pid} started`);
}