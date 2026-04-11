import { createServer } from "node:http";
import { cpus } from "node:os";
import cluster from "node:cluster";
import { once } from "node:events";

if(cluster.isPrimary){
    const availableCpus = cpus(); 
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
        for (const worker of workers){
            console.log(`Stopping worker: ${worker.process.pid}`)
            worker.disconnect(); /* graceful stop. 새 연결 거부하고, 기존 작업(진행중이던) 완료하며, 연결한 모든 클라이언트와의 접속 끊어지길 기다림. 이후 스스로 정상종료 후 종료되는 시점에 primary process는 cluster은 해당 워커에 대한 exit 이벤트르 발행함 */
            await once(worker, 'exit'); 
            if(!worker.exitedAfterDisconnect) continue
            const newWorker = cluster.fork(); 
            await once(newWorker, 'listening')
        }
    })
}else{ /* 각 워커는 different Nodejs process with its own event loop, memory space, and loaded moduels */

    setInterval(
        () => {
            if(Math.random() < 0.2){
                throw new Error(`Ops.. ${process.pid} crashed`)
            }
        }, Math.ceil(Math.random() * 3) * 1000)
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
