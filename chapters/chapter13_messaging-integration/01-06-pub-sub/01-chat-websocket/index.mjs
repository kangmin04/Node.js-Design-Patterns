/* WEBSOCKET만 사용한 version */

import { createServer } from "node:http";
import {WebSocketServer} from 'ws'
import staticHandler from 'serve-handler'

const server = createServer((req,res) => {
    /* 서버로 들어오는 모든 요청(req,res)를 staticHandler에게 전달. 
    web 폴더를 기준으로 요청된 경로에 해당하는 파일을 web 폴더 내에서 찾고 응답으로 보내줌 */
    return staticHandler(req,res,{public:'web'})
})

const wss = new WebSocketServer({server})
wss.on('connection', client => {
    console.log('Client connected')
    client.on('message', msg => {
        console.log(`Message: ${msg}`)
        broadcast(msg)
    })
})

function broadcast(msg){
    for(const client of wss.clients){
        if(client.readyState === WebSocket.OPEN){
            client.send(msg); 
        }
    }
}
const port = process.argv[2] || 8080
server.listen(port, () => {
    console.log(`Server is on http://localhost:${port}`)
})