import {createConnection , connect} from 'node:net';

//create Connection 시 net.Socket 반환
//socket으로 server와 talk 가능
//'connection' 이벤트 시에도 net.Socket 반환됨
const client = createConnection({ port: 8124 }, () => {
  // 'connect' listener.
  console.log('connected to server!');
  client.write('world!\r\n');  
  //socket.write(data,encoding,cb) - send data to socket. 
  //return true if entire data was flushed to buffer. 
});

client.on('data', (data) => { //buffer Or String
  console.log(data.toString());
  // client.end();
});
client.on('end', () => {
  console.log('disconnected from server');
});



