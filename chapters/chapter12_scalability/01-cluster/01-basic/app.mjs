import { createServer } from "node:http";
import { cpus } from "node:os";
import cluster from "node:cluster";

if(cluster.isPrimary){
    const availableCpus = cpus(); 
    console.log(`Primary ${process.pid} is running`)
    for(const _ of availableCpus){
        cluster.fork()
    }
    
    console.log(`cluster.workers: ${(cluster.workers)}`)
    // 3초 후에 모든 워커에게 메시지 방송
    setTimeout(() => {
        console.log('Primary: Broadcasting message to all workers...');
        Object.values(cluster.workers).forEach(worker => {
            worker.send('Hello from the primary'); // worker.prototype으로 send 메서드 물려받음. 
        });
    }, 3000);


}else{ /* 각 워커는 different Nodejs process with its own event loop, memory space, and loaded moduels */

    // 워커가 Primary로부터 메시지를 수신하는 리스너
    process.on('message', (msg) => {
        console.log(`Worker ${process.pid} received a message: "${msg}"`);
    });

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


/* 여기서 배운 
    if(cluster.isPrimary){
        fork()
    }else{
        doOtherWork()
    }
    패턴은 multiple instance를 run하게하는 좋은 패턴. 
*/

