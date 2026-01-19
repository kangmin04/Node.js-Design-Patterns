import {createConnection} from 'node:net'
import { createReadStream } from 'node:fs';

const client = createConnection({
    port : 3000 , //allowHalfOpen : true -> 상대방이 종료하더라도 내 데이터는 계속 보낼수있는 옵션인데, 여기선 pipe(client) 즉, 보내는 내 코드를 종료시키는 거라 의미없다. 
} , () => {
    console.log('Connected to Server'); 
    
})
const filename = process.argv[2]; 

createReadStream(filename)
    // .on('data' , (chunk) => {
    //     client.write(chunk)
    // })
    .pipe(client , {end : false})
    
/*
    pipe : backpressure / 스트림 종료를 자동관리해줌 - readable다 읽으면 'end' 발생. pipe는 자동으로 writableStream.end()호출. 여기서 writable이 client(socket)임. duplex니까. 
    on('data' , ) 는 아님. -> readStream이 네트워크 처리 속도와 상관없이 파일 계속 읽음. -> 버퍼가 꽉 차도 계속해서 backpressure 문제,,, 
    => pipe는 내부적으로 write가 false(꽉 찬 경우) , pause 하고 이후 drain 발생 시 resume함. 
*/


client.on('data', (data) => { //buffer Or String
    console.log('Received From Server:' , data.toString());
    // client.end();
  });
client.on('end', () => {
    console.log('disconnected from server');
});

// process.stdin.on('data' , (data) => {
//     const message = data.toString().trim(); 
//     if(message === 'quit'){
//         client.end(); 
//     }else{
//         client.write(message); 
//     }
// })
