// chapters/chapter13_messaging-integration/06-chat-redisStream-discern-user/index.mjs

import { createServer } from "node:http";
import staticHandler from 'serve-handler';
import { WebSocketServer } from "ws";
import Redis from "ioredis";
import { v4 as uuidv4 } from 'uuid';

const redisClient = new Redis();
const redisClientXread = new Redis();

const server = createServer((req, res) => {
    return staticHandler(req, res, { public: 'web' })
});

const STREAM_KEY = 'chat_stream_rooms'

const wss = new WebSocketServer({ server });

wss.on('connection', async (client) => {
    
    client.id = uuidv4();
    console.log(`Client connected: ${client.id}`);

    // client에게 사용자의 고유 id 전송 
    client.send(JSON.stringify({
        type: 'ID_ASSIGN',
        payload: client.id
    }));

    client.on('message', msg => {
        // try {
        //     // 모든 메시지는 JSON 형식이라고 가정하고 파싱합니다.
        //     data = JSON.parse(msg.toString());
        // } catch (error) {
        //     console.error('Invalid JSON received, ignoring message:', msg.toString());
        //     return;
        // }

        // const data =  JSON.parse(msg.toString())
        /* 다른 사용자 방 JOIN 시..  */

        // [수정] 채팅 메시지를 저장할 때도 타입을 'CHAT_MESSAGE'로 통일합니다.
        redisClient.xadd(
            'chat_stream',
            "*",
            'message', JSON.stringify({
                type: 'CHAT_MESSAGE',
                payload: {
                    text: msg.toString(),
                    senderId: client.id,
                    timestamp: Date.now(),
                }
            })
        );
    });

    // 과거 대화 기록 전송
    const logs = await redisClient.xrange('chat_stream', '-', '+');
    for (const [, [, message]] of logs) {
        // 과거 메시지도 현재 클라이언트에게 전송
        client.send(message);
    }
});

async function listenForMessages() {
    let lastId = '$';
    while (true) {
        const results = await redisClientXread.xread('BLOCK', 0, 'STREAMS', 'chat_stream', lastId);
        const [[, messages]] = results; /* 여기서 message는 redis stream에서 읽어온 값이고, ioRedis는 Buffer혹은 문자열로 가져옴. */
        for (const [id, [, message]] of messages) {
            console.log(`Message from stream: ${message}`)
            // 모든 클라이언트에게 브로드캐스팅
            for (const client of wss.clients) {
                if (client.readyState === client.OPEN) {
                    client.send(message); /* client.send()에 buffe 혹은 문자열 전달되었으므로, 이를 Binary Frame에 담아서 보냄.  */
                    /* 
                        클라이언트에선 ws.onmessage로 받는데, Binary Frame을 Blob 형식으로 담아서 줌.
                        blob 객체에 담기므로, 바로 JSON.parse못함
                    */
                }
            }
            lastId = id;
        }
    }
}

listenForMessages();

server.listen(process.argv[2], () => {
    console.log(`Server is listening on http://localhost:${process.argv[2]}`);
});
