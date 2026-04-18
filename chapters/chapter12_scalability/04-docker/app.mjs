import { createServer } from "node:http";
import { hostname } from "node:os";

const version = 1; 

createServer((_req, res) => {
    res.end(`Hello from ${hostname()} (v${version})`)
}).listen(8080); 
