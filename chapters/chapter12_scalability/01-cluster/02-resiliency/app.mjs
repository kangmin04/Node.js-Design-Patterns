import { createServer } from "node:http";
import { cpus } from "node:os";
import cluster from "node:cluster";

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
