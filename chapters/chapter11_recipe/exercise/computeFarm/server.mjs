import { createServer } from "node:http";
import { Worker } from "node:worker_threads";
import { join } from "node:path";

const workerFile = join(import.meta.dirname, 'workers', 'computeFarmWorker.mjs')
const worker = new Worker(workerFile, 2)

const server = createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const { code, args } = JSON.parse(body);
            
            worker.postMessage({code, args})

            worker.on('message', (result) => {
                res.writeHead(200, {'content-type': 'application/json'})
                res.end(JSON.stringify({result})); 
                worker.terminate(); //작업 종료 후 워커 종료 
            })            
            worker.on('error', (err) => { 
                res.writeHead(500)
                res.end(JSON.stringify({error: err.message}))
            });
            worker.on('exit', (code) => { console.log(`워커 종료, 코드: ${code}`)});
            res.end('ok');
        });
    }else{
        res.writeHead(404)
        res.end()
    }
})
server.listen(3000, () => console.log(`Server is running on http://localhost:3000`));

server.on('error', (err) => { 
    console.error(err)
    process.exit(1)
})