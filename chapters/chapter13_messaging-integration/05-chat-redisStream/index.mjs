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

    const logs = await redisClient.xrange('chat_stream', '-', '+')
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
            'BLOCK', '0', 
            'STREAMS',
            'chat_stream', 
            lastRecordId
        )

        for(const [recordId, [, message]] of records){
            broadcast(Buffer.from(message))
        }
    }
}