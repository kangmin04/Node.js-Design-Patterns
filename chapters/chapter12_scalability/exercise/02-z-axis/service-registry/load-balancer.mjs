import { createServer } from "node:http";
import { createProxyServer } from "httpxy";
import { ConsulClient } from "./consul.mjs";

const port = 8080; 
const proxy = createProxyServer(); 
const consul = new ConsulClient(); 
//프록시 자체의 에러 핸들러는 필수다! 
//백엔드 서버와 연결안될 때 등의 에러들 잡음. 해당 핸들러 없으면 로드 밸런스 프로세스가 죽어버림! 

proxy.on('error', (err, req, res) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Bad Gateway', message: 'Could not connect to the backend service.' }));
});


function selectGroupByLetter(letter){
    if(/[a-d]/i.test(letter)){
        return 'A-D'
    }
    if(/[e-p]/i.test(letter)){
        return 'E-P'
    }
    return 'Q-Z'
    
}

//req : curl localhost:8080/api/people/byFirstName/{letter}
const server = createServer(async (req, res) => {
    try{
        /* API 유효성 검사 (정해진 API 요청 아닌경우 차단) */
        const urlMatch = req.url.match(/\/api\/people\/byFirstName\/([a-z])$/i);
        if (!urlMatch) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Not Found', message: 'The requested API endpoint is invalid.' }));
        }
     
        const letter = req.url.split('/').pop(); // req.url.slice(-1)보다 훨씬 가독성 좋음. 배우자 이런건. 
        if(!(/[a-z]/i.test(letter))){
            throw new Error('Given letter is not included in alphabet.')
        }
        const services = await consul.getAllServices(); 
        
        const group = selectGroupByLetter(letter); 
        const server = Object.values(services).find(service => service.Tags.includes(group))
        console.log(server)

        if (server.Port === port) {
            console.error(`CRITICAL: Infinite loop detected! Service ${server.ID} is registered on the load balancer's port.`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Internal Server Error', message: 'Misconfiguration detected: service proxying to self.' }));
        }

        const target = `http://${server.Address}:${server.Port}`
        proxy.web(req,res,{target})
        return; 
    }catch(err){
        console.error(err); 
        res.writeHead(502); 
        return res.end('Bad gateway')
    }
})

server.listen(8080, () => console.log(`LB is running on http://localhost:${port}`))