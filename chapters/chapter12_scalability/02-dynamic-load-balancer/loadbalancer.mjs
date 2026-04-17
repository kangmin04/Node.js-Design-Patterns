import { createServer } from "node:http";
import {createProxyServer} from 'httpxy'
import {ConsulClient} from './consul.mjs'

const routing = [
    {
        path: '/api', 
        service: 'api-service', 
        index: 0
    },
    {
        path: '/', 
        service: 'webapp-service', 
        index: 0 // round robin을 위한, last server 기록용 인덱스 
    }
] 
const consulClient = new ConsulClient(); 
const proxy =createProxyServer(); 

const server = createServer(async (req, res) => {
    const route = routing.find(route => req.url.startsWith(route.path))
    try{
        const services = await consulClient.getAllServices(); 
        const servers = Object.values(services).filter(service => service.Tags.includes(route.service)) 
        if(servers.length > 0){
            route.index = (route.index + 1) % servers.length; 
            const server = servers[route.index]; 
            const target = `http://${server.Address}:${server.Port}`
            proxy.web(req, res, {target}) /* req 객체를 바탕으로 target에 요청(새로운 server to server)을 보냄. target 서버가 보내는 응답을 감시하다가 응답 오면 res 객체로 내용 pipe함.  */
            return; 
        }
    }catch(err){
        console.error(err); 
    }
    //service not found.
    res.writeHead(502); 
    return res.end('Bad gateway')
})

server.listen(8080, () => {
    console.log(`Load balancer started on port 8080`)
})


