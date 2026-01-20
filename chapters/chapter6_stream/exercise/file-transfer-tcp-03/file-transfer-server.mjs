//여러 파일을 동시에 .... 
import { createWriteStream, mkdir } from 'node:fs';
import {createServer} from 'node:net'

const port = 8080; 



mkdir('received_files' , {resursive : true} , (err) => {
    if(err) throw err; 
})

const server = createServer(socket => {
    socket.on('readable' , () => {
        let channelId = null; 
        let channelLength = null;  //상태변수를 소켓 스코프 내에 두는 이유??>?
        const destination = {}; //writable stream

        let chunk; 
        console.log('readable server');
        if(channelId === null){

            chunk = socket.read(1); 
          
            if(channelId === null) {
                return null; 
            }
            channelId = chunk.readUInt(0); 

            if(!destination[channelId]){
                let filePath = `received/file-${channelId}`
                console.log(`createWritableStream for ${filePath}` ); 
                destination[channelId] = createWriteStream(filePath); 
            }
        }
        if(channelLength === null){

            chunk = socket.read(4); 
            channelLength = chunk?.readUInt32Be(0)
            if(channelLength === null) {
                return null; 
            }
        }
        chunk = socket.read(channelLength);    
        console.log(chunk)     

        //writable stream을하려면 파일 이름을 어케 받아오지고민했엇다. 
        destination[channelId].write(chunk); 

        channelId = null ; 
        channelLength = null;
    })


    socket.on('end' , () => {
        console.log('client Disconnected'); 
        for (const channel in destination) {
            destinations[channel].end();
            console.log(`File stream for channel ${channel} closed.`);
        }
    })
})

server.on('connection' , () => {
    console.log('server: server connected')
})

server.listen(port , () => {
    console.log('server: server is listening on' , port)
})
