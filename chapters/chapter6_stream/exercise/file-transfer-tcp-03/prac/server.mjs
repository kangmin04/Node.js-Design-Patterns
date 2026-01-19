import { createWriteStream } from 'node:fs';
import {createServer} from 'node:net'

const server = createServer(socket => {
    console.log('client connected') ; 
    socket.on('data' , (data) => {
        console.log('Received From client Write Method: ' , data.toString()); 
        socket.write(data.toString().toUpperCase()); 
   })
})
server.on('connetion' , () => {
    console.log('Server 연결됨')
} )


server.on('error' ,  (err) => {
    server.close(); 
    throw err
});

server.on('close' , () => {
    console.log('from Server Event Emitter: server closed'); 
})

server.listen(3000 , () => {
    console.log('Server Listen on Port 3000')
})

