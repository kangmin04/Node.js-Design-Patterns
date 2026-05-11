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

const wss = new WebSocketServer({ server });

wss.on('connection', async (client) => {
    client.id = uuidv4();
    console.log(`Client connected: ${client.id}`);

    // [수정] 클라이언트에게 ID를 보낼 때 타입을 'ID_ASSIGN'으로 명확하게 지정합니다.
    client.send(JSON.stringify({
        type: 'ID_ASSIGN',
        payload: client.id
    }));

    client.on('message', msg => {
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
        const [[, messages]] = results;
        for (const [id, [, message]] of messages) {
            console.log(`Message from stream: ${message}`)
            // 모든 클라이언트에게 브로드캐스팅
            for (const client of wss.clients) {
                if (client.readyState === client.OPEN) {
                    client.send(message);
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
