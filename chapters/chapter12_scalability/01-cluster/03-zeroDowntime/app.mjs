import { createServer } from "node:http";
import { cpus } from "node:os";
import cluster from "node:cluster";
import { once } from "node:events";

if(cluster.isPrimary){
    const availableCpus = cpus();
    // const mockCpu = [1, 2]; 
    console.log(`Primary ${process.pid} is running`)
    for(const _ of availableCpus){
        cluster.fork()
    }

    cluster.on('exit', (worker, code) => {
        if(code !== 0 && !worker.exitedAfterDisconnect){ /* exitedAfterDisconnect: worker.kill() 또는 worker.disconnect()로 종료 시 true, ERROR로인해 종료되면 false */
            console.log(`Worker ${worker.process.pid} died with code ${code}. Starting A New Server`)
            cluster.fork()
        }
    })

    process.on("SIGUSR2", async () => { /* SIGUSR : User가 정의하는 이벤트 KILL SIGUSR2 PID */
        const workers = Object.values(cluster.workers); 
        // console.log('[DEBUG] workers: ', workers)
        for (const worker of workers){
            console.log(`Stopping worker: ${worker.process.pid}`)
            //1. 안전한 종료 시도
            worker.disconnect(); /* graceful stop. 새 연결 거부하고, 기존 작업(진행중이던) 완료하며, 연결한 모든 클라이언트와의 접속 끊어지길 기다림. 이후 스스로 정상종료 후 종료되는 시점에 primary process는 cluster은 해당 워커에 대한 exit 이벤트르 발행함 */
            
            // 2. 2초 뒤에도 안 죽으면 강제 종료시키는 타이머 설정 (처음 코드에선 setInterval 작업이 계속해서 worker process에서 돌아갔기에 기존 작업이 종료가 안되서, 새로운 fork가 안일어났음. 
            //다만 실무 환경에선 백그라운드에서 계속 setINterval등이 돌아가는 경우도 있을수 있음(db) 그렇기에 관리자처럼 timeout 기능을 도입하는게 적합! )
            const killTimeout = setTimeout(() => {
                if (!worker.isDead()) {
                    console.log(`Worker ${worker.process.pid} 미종료. 강제 종료(kill) 진행`);
                    worker.kill();
                }
            }, 2000);
            await once(worker, 'exit'); 
            if(!worker.exitedAfterDisconnect) continue /* 의도된 disconnect 시 대체 worker fork.  */
            const newWorker = cluster.fork(); 
            await once(newWorker, 'listening')
        }
    })
}else{ /* 각 워커는 different Nodejs process with its own event loop, memory space, and loaded moduels */

    // setInterval(
    //     () => { /* 무중단 배포 로직에 집중하고자, ERROR 야기 코드 없앰. -> Primary Process 멈추면 자동으로 worker들이 하나씩 생성.  */
    //         // if(Math.random() < 0.2){
    //         //     throw new Error(`Ops.. ${process.pid} crashed`)
    //         // }
    //     }, Math.ceil(Math.random() * 8) * 1000)
    const server = createServer((_req, res) => {
        /* Simulate CPU intensive work */
        let i = 1e7; 
        while (i > 0){
            i--
        }
        console.log(`Handling req from ${process.pid}`)
        res.end(`Hello from ${process.pid}`)
    })
    
    server.listen(8080, () => console.log(`http://localhost:8080 Started at ${process.pid}`))
}
