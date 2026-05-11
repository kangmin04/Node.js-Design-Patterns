import { createServer } from "node:http";
import staticHandler from 'serve-handler'
import { WebSocketServer } from "ws";
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";


const redisClient = new Redis(); 
const redisClientXread = new Redis(); 

const server = createServer((req, res) => {
    return staticHandler(req, res, { public: 'web' })
  })


const wss = new WebSocketServer({server}); 
wss.on('connection', async client => {
    client.id = uuidv4(); 
    /*
        처음엔 프론트에서 msg보낼때마다 id를 함께 보내주자 생각함. BUT connection내부의 client 객체는 연결 끊어질 때까지 계속 살아있음. 
        지금 구현중인 프로그램은, 익명 기반 msg 앱이라 새로고침 등으로 연결이 끊기면 새로운 사용자로 인식하는게 당연함. 카톡같은건 로그인 기반으로 JWT token 통해서 id fix해주면 됨
    */
    console.log(`client connected to ${client.id}`); 
    client.send(JSON.stringify({
        type: 'id', 
        payload: client.id 
    }))
    client.on('message', msg => {
        console.log(`Message from ${client.id}:`, msg.toString());
        redisClient.xadd(
            'chat_stream', 
            "*", 
            'message', JSON.stringify({
                type: 'message', 
                payload: {
                    text: msg.toString(), 
                    senderId : client.id, 
                    timestamp: Date.now(),
                }
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