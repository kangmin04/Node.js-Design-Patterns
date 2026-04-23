import { createServer } from "node:http";
import { createProxyServer } from "httpxy";

const port = 8080; 
const proxy = createProxyServer(); 

const instanceServer = {
    AtoD : 8081, 
    EtoP : 8082, 
    QtoZ : 8083
}

function selectServerByLetter(letter){
    if(/[a-d]/i.test(letter)){
        return instanceServer.AtoD
    }
    if(/[e-p]/i.test(letter)){
        return instanceServer.EtoP
    }
    return instanceServer.QtoZ
    
}

//req : curl localhost:8080/api/people/byFirstName/{letter}
const server = createServer((req, res) => {
    const letter = req.url.split('/').pop(); // req.url.slice(-1)보다 훨씬 가독성 좋음. 배우자 이런건. 
    if(/[a-z]/i.test(letter)){
       const serverInstancePort = selectServerByLetter(letter); 
       const target = `http://localhost:${serverInstancePort}`
       proxy.web(req,res,{target})
       return; 
    }else{
        res.writeHead(300)
        res.end('Non appropriate letter')
    }
})

server.listen(8080, () => console.log(`LB is running on http://localhost:${port}`))