import { createConnection } from "node:net";
import { createReadStream } from "node:fs";
const inputFiles = process.argv.slice(2)

const client = createConnection({port : 8080} , 
    () => {console.log('client: server/client connectec')}
)


client.on('end' , () => {
    console.log('client: client end' )
    client.end(); 
})


client.on('data' , (data) => {
    console.log('client: data received' , data.toString() )
})

function sendFileToServer(inputFiles , destination){
    for(let i=0 ; i < inputFiles.length ; i++){
        let newStream= createReadStream(inputFiles[i])
         newStream// 1. 해당 파일 내용을 readable한 스트림으로 . 
            .on('readable' , () => {
                let chunk ; 
                while((chunk = newStream.read()) !== null){
                    let markedBuffer = Buffer.alloc(1+8); 
                    markedBuffer.writeUint8(i,0); 
                    markedBuffer.writeInt32BE(chunk.length,1); 
                    chunk.copy(markedBuffer , 5)   
                    destination.write(markedBuffer);
                    console.log('write packet to header(' , i , ')')
                }
            })
            .on('end' , () => {
                console.log('end이벤트 발생함'); 
                if(i === inputFiles.length -1){
                    destination.end(); 
                }
            })
         
    }
}

sendFileToServer(inputFiles , client)