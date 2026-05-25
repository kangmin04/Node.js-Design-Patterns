/*
    redisClient -----------  centralized in memory server  ------------- redisClientXread
                xadd()로 field 저장                          xread()로 읽어옴. (이때 하나 읽어올 때 다른 작업은 못함! 싱글스레드)
                (key-value)                                 연결 끊긴 후에도 마지막 record를 기억하기에 해당 record 이후부터 읽어오면 됨
                client와 서버는 tcp/ip연결 
*/

import { createServer } from "node:http";
import staticHandler from 'serve-handler'
import { WebSocketServer } from "ws";
import Redis from "ioredis";
const redisClient = new Redis(); 
const redisClientXread = new Redis(); 

const server = createServer((req, res) => {
    return staticHandler(req, res, { public: 'web' })
  })
  
const wss = new WebSocketServer({server}); 
wss.on('connection', async client => {
    console.log('client connected'); 
    client.on('message', msg => {
        console.log('Sending message:', msg.toString()) 
        redisClient.xadd(
            'chat_stream', 
            "*", 
            'message', JSON.stringify({
                text: msg.toString(), 
                timestamp: Date.now(),
            })
        )
    } )
    /* client 에서 connection할 때마다(웹 새로고침할 때마다) 전체 chat data 가져옴 */
    const logs = await redisClient.xrange('chat_stream', '-', '+')
    console.log(`chat logs: ${logs}`)
    /* 
        for (const [recordId, [propertyId, message]] of logs 을 destructuring함) 
        logs엔 [
            ["158859110918-0", ["message", "this is a new message"]], 
            ["158859110918-1", ["message", "this is another message"]], 
        ] 다음과 같은 형식임! 

    */   
    for (const [,[, message]] of logs){    
        client.send(Buffer.from(message))
    }
})

function broadcast(msg){
    for(const client of wss.clients){ 
        if(client.readyState === WebSocket.OPEN){
            client.send(msg); 
        }
    }
}

let lastRecordId = '$'
async function processStreamMessages(){
    while(true){
        const [[, records ]] = await redisClientXread.xread(
            'BLOCK', '0', /* wait forever till new msg arrive */
            'STREAMS', /* keyword that we r now going to specify the details of the streams */ 
            'chat_stream', /* name of the stream we want to read */
            lastRecordId /* $: 가장 처음부터 읽는 sign.  */
        )

        for(const [recordId, [, message]] of records){
            console.log(`Message from stream: ${message}`)
            broadcast(Buffer.from(message))
            lastRecordId = recordId
        }
    }
}

processStreamMessages().catch(err => console.log(err))
server.listen(process.argv[2] || 8080 , () => console.log(`server is runnning on http://localhost:${process.argv[2]} `))