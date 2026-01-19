import {createServer} from 'node:net'

//createServer returns class : net.Server
const server = createServer(socket => {
    console.log('client connected') ; 

    socket.on('end' , () => {
        console.log('client disconnected')
    })

    socket.write('hi from server')

    socket.on('data' , (data) => {
        console.log('Received From client Write Method: ' , data.toString()); 
   })
})

server.on('error' ,  (err) => {
    server.close(); 
    throw err
});

server.on('close' , () => {
    console.log('from Server Event Emitter: server closed'); 
})

server.on('listening' , () => {
    console.log('FROM listening Event: server starts');
    console.log('FROM Listening:',server.address())
})
server.listen(8124, () => {
        console.log('server bound');
})