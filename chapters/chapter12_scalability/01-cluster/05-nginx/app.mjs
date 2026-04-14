import { createServer } from "node:http";

const server = createServer((req, res) => {
    let i = 1e7; 
    while (i > 0){
        i--
    }

    console.log(`Handling req from ${process.pid}`)
    res.end(`Hello from ${process.pid}`)
});

const PORT = Number.parseInt(process.env.PORT || process.argv[2] || 8080) // nginx는 다른 머신 혹은 다른 포트에 대해서도 load balancing 가능함. -> cli로 input 받는거로 설정

server.listen(PORT, () => {
  console.log(`Worker ${process.pid} started. listening on port ${PORT}`);
});
