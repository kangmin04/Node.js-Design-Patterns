import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import staticHandler from 'serve-handler' // v6.1.6
import amqp from 'amqplib'
const httpPort = process.argv[2] || 8080; 

const connection = await amqp.connect('amqp://localhost') 
const channel = await connection.createChannel(); 
await channel.assertExchange('chat', 'fanout')  /* to make sure there is chat exchange */
const {queue} = await channel.assertQueue(`chat_srv_${httpPort}`, {exclusive: true}) /* 현재 채팅 서버는 오프라인 시 queue를 안받음! 저장은 history-service에서 함*/
await channel.bindQueue(queue, 'chat')
channel.consume(queue, (msg) => {
    msg = msg.content.toString(); 
    console.log(`From queue: ${msg}`)
    broadcast(Buffer.from(msg)) /* buffer.from으로 굳이 새로운 버퍼 만들어서 보내는 이유? consume 중 갑자기 새로운 buffe 업데이트 될수도 있어서?  */
    
}, {noAck: true}) 


// serve static files
  const server = createServer((req, res) => {
    return staticHandler(req, res, { public: 'web' })
  })
  

const wss = new WebSocketServer({server}); 
wss.on('connection', client => {
    console.log('client connected'); 
    client.on('message', msg => {
        console.log('message:', msg.toString()) 
        broadcast(msg)
    } )
})
function broadcast(msg){
    for(const client of wss.clients){
        if(client.readyState === WebSocket.OPEN){
            client.send(msg); 
        }
    }
}


server.listen(httpPort, () => {
    console.log(`Server listening on port ${httpPort}`)

})