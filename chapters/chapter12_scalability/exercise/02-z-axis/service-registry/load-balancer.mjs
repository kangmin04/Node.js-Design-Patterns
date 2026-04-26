import { createServer } from "node:http";
import { createProxyServer } from "httpxy";
import { ConsulClient } from "./consul.mjs";
import logger from "./logger.mjs";

const port = 8080; 
const proxy = createProxyServer(); 
const consul = new ConsulClient(); 
//프록시 자체의 에러 핸들러는 필수다! 
//백엔드 서버와 연결안될 때 등의 에러들 잡음. 해당 핸들러 없으면 로드 밸런스 프로세스가 죽어버림! 
proxy.on('error', (err, req, res) => {
    logger.error('Proxy connection error', { 
        error: err.message, 
        url: req.url,
        ip: req.socket.remoteAddress
    });

    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Bad Gateway', message: 'Could not connect to the backend service.' }));
});
/* logger용 응답 시간 계산 함수 */
function getDurationInMs (startTime) {
    const [sec, nano] = process.hrtime(startTime)
    return (sec * 1000) + (nano / 1000000)
  }

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
    const startTime = process.hrtime();
    logger.info('startTime: ', startTime)
    logger.info(`Incoming request`, { method: req.method, url: req.url, ip: req.socket.remoteAddress });    
    /* Incoming하는 요청들에 대해서도 log를 남겨두자 !!  요청의 시작점 파악 가능 */
    try{
        /* API 유효성 검사 (정해진 API 요청 아닌경우 차단) */
        const urlMatch = req.url.match(/\/api\/people\/byFirstName\/([a-z])$/i);
        if (!urlMatch) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            logger.error(`Not Found: Invalid API endpoint`, { url: req.url });
            return res.end(JSON.stringify({ error: 'Not Found', message: 'The requested API endpoint is invalid.' }));
        }
     
        const letter = req.url.split('/').pop(); // req.url.slice(-1)보다 훨씬 가독성 좋음. 배우자 이런건. 
        if(!(/[a-z]/i.test(letter))){
            throw new Error('Given letter is not included in alphabet.')
        }
        const services = await consul.getAllServices(); 
        if (services.length === 0) {
            throw new Error(`No healthy instances found for service group: ${group}`);
        }
        const group = selectGroupByLetter(letter); 
        const server = Object.values(services).find(service => service.Tags.includes(group))

        logger.info(`Forwarding request to service`, { service: server.ID, address: server.address, port: server.port, group });
        
        if (server.Port === port) {
            logger.error(`CRITICAL: Infinite loop detected! Service ${server.ID} is registered on the load balancer's port.`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Internal Server Error', message: 'Misconfiguration detected: service proxying to self.' }));
        }

        const target = `http://${server.Address}:${server.Port}`
        proxy.web(req,res,{target})
        return; 
    }catch(err){
        const durationInMs = getDurationInMs(startTime);
        logger.error(`Failed to process request before proxying`, { 
            error: err.message,
            durationMs: durationInMs
        });

        res.writeHead(502); 
        return res.end('Bad gateway')
    }
})

// 백엔드에서 응답이 왔을 때 발생하는 이벤트
proxy.on('proxyRes', (proxyRes, req, res) => {
    // 응답이 클라이언트에게 완전히 전송되었을 때 로그를 남기기 위해 'finish' 이벤트를 사용
    res.on('finish', () => {
        // res에서 startTime을 가져오려면 req 객체에 저장해두는 트릭을 사용할 수 있습니다.
        // 여기서는 단순화를 위해 startTime을 외부 스코프에서 직접 접근하기는 어렵습니다.
        // 하지만 상태코드 로깅만으로도 큰 의미가 있습니다.
        logger.info('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode // 최종 클라이언트에게 나간 상태 코드
        });
    });
});


server.listen(8080, () => logger.info(`LB is running on http://localhost:${port}`))