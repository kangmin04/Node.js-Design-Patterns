//여러 파일을 동시에 .... 
import { createWriteStream, mkdir , existsSync} from 'node:fs';
import {createServer} from 'node:net'

const port = 8080; 

if(!existsSync('./received_files')){
    console.log('file없어서 만듦')
    mkdir('received_files' , {recursive : true} , (err) => {
        if(err) throw err; 
    })
}

const server = createServer(socket => {
    /*
        안에 정의하는 이유!! 
        if socket A를 보내는 중 socket B데이터가 들어오면
        전역으로 선언한 경우, A의 값이 그대로 B에 의해 오염됨

        socket 내부 콜백함수는 클라이언트 요청 받을 때마다 실행됨. 
        이때 각 클라이언트 socket은 자신만의 독립적인 공간(스코프) 가짐. -> 클로져.. 

    */
    let channelId = null;
    let channelLength = null;
    const destination = {}; // Writable streams per channel, scoped to this connection

    /*
        클라이언트에서 socket.write()로 보내면 os는 도착한 데이터 패킷을 internal buffer에 보관해둠. 
        이후 읽어갈 데이터가 준비됐단 뜻의 readable 이벤트를 발생시킴. 
        server가 socket.read() 호출 시 버퍼에 쌓인 데이터를 실제로 가져옴.     
    */
    socket.on('readable' , () => { //이때의 socket은 클로져로 인해 자신의 렉시컬스코프 내에서 올바른 channelId로 접근
        let chunk; 
        if(channelId === null){
            chunk = socket.read(1); 
            if (chunk === null) {
                return;
            }
            channelId = chunk.readUInt8(0);
            
            if(!destination[channelId]){
                const filePath = `received_files/file${channelId}.txt`;
                console.log(`Creating writable stream for ${filePath}`);
                destination[channelId] = createWriteStream(filePath); 
            }
        }
        if(channelId == '2'){
            console.log('ChannelId : ' , channelId)
        }
        if(channelLength === null){
            chunk = socket.read(4); 
            if (chunk === null) {
                return;
            }
            channelLength = chunk.readUInt32BE(0);
        }
        if(channelId == '2'){
            console.log('ChannelId : ' , channelId)
        }
        chunk = socket.read(channelLength);  
        if(chunk === null){
            if(channelId == '2'){
                console.log('In chunk === null -> hannelId : ' , channelId)
            }
            return; 
        }          
        if(channelId == '2'){
            console.log('ChannelId : ' , channelId)
        }
        console.log(`Received data for channel ${channelId}`);
        destination[channelId].write(chunk); 
        /*
            스트림 생성 자체는 동기. 
            BUT 스트림으로 실제 데이터 작성 등 작업은 비동기. 
            
            Node.js의 메인 스레드는 write()를 통해 데이터 쓰기 작업을 내부 I/O 스레드 풀에 맡기고, 
            자신은 바로 다음 코드를 실행하며 다른 일을 처리합니다.
            실제 파일에 데이터가 쓰이는 작업은 백그라운드에서 일어납니다.
            모든 쓰기 작업이 끝나면 스트림은 'finish' 이벤트를 발생시켜 작업이 완료되었음을 알려줍니다.
        */
        channelId = null; 
        channelLength = null;
    });

    socket.on('end' , () => {
        console.log('Client Disconnected'); 
        for (const channel in destination) {
            destination[channel].end();
            console.log(`File stream for channel ${channel} closed.`);
        }
    });
});

server.on('connection' , () => {
    console.log('server: server connected');
});

server.listen(port , () => {
    console.log('server: server is listening on' , port);
});
