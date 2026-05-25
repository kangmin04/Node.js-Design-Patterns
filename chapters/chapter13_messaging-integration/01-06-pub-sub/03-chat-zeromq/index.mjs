import { createServer } from "node:http";
import { parseArgs } from "node:util";
import { WebSocketServer } from "ws";
import staticHandler from 'serve-handler' // v6.1.6
import zmq from 'zeromq'

const {values:args} = parseArgs({ /* parseArgs는 { values: {}, positionals: [] 형태로 리턴하고, const {values:args}}는 객체구조분해할당으로, values를 꺼내서 args 이름의 상수로 담음. -> args.http, args.pub 등으로 접근 */
    options: {
        http: {  /* cli에서 --http 인자 찾고, 그 뒤에 오는 값을 string 취급하라는 것 */
            type: 'string', 
        }, 
        pub : {
            type : 'string' ,
        },
        sub: {
            type: 'string',
            multiple: true
        }
    }, 
    args: process.argv.slice(2), 
})

if (!(args.http && args.pub && args.sub)) {
    console.error(
      'Usage: node index.js --http <port> --pub <port> --sub <port1> [--sub <port2> ...]'
    )
    process.exit(1)
  }
  
  // serve static files
  const server = createServer((req, res) => {
    return staticHandler(req, res, { public: 'web' })
  })
  
const pubSocket = new zmq.Publisher(); 
await pubSocket.bind(`tcp://127.0.0.1:${args.pub}`)
const subSocket = new zmq.Subscriber()

for (const port of args.sub) {
    await subSocket.connect(`tcp://127.0.0.1:${port}`)
}

subSocket.subscribe('chat_messages'); 

async function receiveMessages(){
    for await (const [_topic, msg] of subSocket){
        console.log(`Received messages from another server: ${msg}`) /* 백틱 형식의 템플릿 리터럴의 경우, JS가 객체를 문자열로 표현하기위해 내부적으로 toString() 호출함. 결국 둘다 msg 자체는 버퍼임!  */
        broadcast(Buffer.from(msg)) /* braodcast 도중, zeromq가 다음 메시지 수신하여 msg가 가리키던 메모리 공간을 덮어쓸 경우, 데이터 손실발생. 
        buffer.from을 통해 기존 버퍼의 내용을 그대로 복사하여, 완전히 새로운 독립적인 버퍼 객체 생성함. 
        */
    }
}
receiveMessages(); 

const wss = new WebSocketServer({server}); 
wss.on('connection', client => {
    console.log('client connected'); 
    client.on('message', msg => {
        console.log('message:', msg.toString()) 
        broadcast(msg); /* ws는 zeromq보다 고수준의 라이브러리. message 이벤트 실행 동안, ws는 msg의 내용이 변하지않고 안전하게 유지되는것을 보장해줌.  
        */
        pubSocket.send(['chat_messages', msg])
    } )
})
function broadcast(msg){
    for(const client of wss.clients){
        if(client.readyState === WebSocket.OPEN){
            client.send(msg); 
        }
    }
}


server.listen(args.http, () => {
    console.log(`Server listening on port ${args.http}`)

})