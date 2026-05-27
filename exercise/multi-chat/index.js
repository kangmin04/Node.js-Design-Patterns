import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'node:fs';

// ESM 환경에서 __dirname을 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIME 타입을 결정하기 위한 맵
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
};

// Express의 app.use(express.static(...)) 역할을 하는 함수
const requestListener = (req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    const requestedPath = path.join(__dirname, 'public', filePath);

    // /socket.io/ 경로는 Socket.IO가 내부적으로 사용하므로, 파일 시스템에서 찾지 않도록 합니다.
    if (filePath.startsWith('/socket.io/')) {
        // Socket.IO 서버가 이 요청을 처리하도록 여기서 핸들링을 멈춥니다.
        return;
    }

    fs.readFile(requestedPath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // 파일을 찾을 수 없는 경우
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                // 다른 서버 오류
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
            }
        } else {
            // 파일을 성공적으로 읽은 경우
            const extname = path.extname(requestedPath);
            const contentType = mimeTypes[extname] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
};

const server = createServer(requestListener);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 클라이언트가 'joinRoom' 이벤트를 보내면 실행됩니다.
  socket.on('joinRoom', ({ username, room }) => {
    // 소켓 객체에 사용자 정보와 방 정보를 저장해둡니다.
    socket.username = username;
    socket.room = room;

    // Socket.IO의 내장 기능을 사용하여 특정 방에 클라이언트를 참여시킵니다.
    socket.join(room); /* room이란 이름표가 붙은 채널을 만들고, 접속한 사용자를 그 채널의 구독자로  등록함.  */

    // 현재 접속한 클라이언트에게만 환영 메시지를 보냅니다.
    socket.emit('message', {
      username: 'ChatBot',
      text: `Welcome to the ${room} room, ${username}! Feel free to chat.`,
    });

    // 자신을 제외한, 같은 방에 있는 모든 클라이언트에게 입장 사실을 알립니다.
    socket.broadcast.to(room).emit('message', {
      username: 'ChatBot',
      text: `${username} has joined the chat.`,
    });
  });

  // 클라이언트로부터 채팅 메시지를 받으면 실행됩니다.
  socket.on('chatMessage', (msg) => {
    // 메시지를 보낸 클라이언트가 속한 방(room)에만 메시지를 전달합니다.
    io.to(socket.room).emit('message', {
      username: socket.username,
      text: msg,
    });
  });

  // 클라이언트의 연결이 끊어졌을 때 실행됩니다.
  socket.on('disconnect', () => {
    if (socket.username) {
      console.log(`User disconnected: ${socket.id}`);
      io.to(socket.room).emit('message', {
        username: 'ChatBot',
        text: `${socket.username} has left the chat.`,
      });
    }
  });
});

const PORT = process.argv[2];
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
