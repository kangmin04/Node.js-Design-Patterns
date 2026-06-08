/* STUDY ABOUT LENGTH PREFIX ENCODING + 네트워크 인코딩 시 다른 방법들  
        json으로 transmit 시 continuous butes of stream 이기에 단어 구분이 안됨
        4바이트로 subsequent data의 length
      
      */
      
import { createServer } from 'node:net'

const server = createServer(socket => {
  socket.on('error', err => {
    console.error('Server error', err.message)
  })

  let buffer = Buffer.alloc(0); 
  socket.on('data' , chunk => {
    buffer = Buffer.concat([buffer, chunk])

    while(buffer.length >= 4){
        const messageLength = buffer.readUInt32BE(0); 
        if(buffer.length < 4 + messageLength){
          return; 
        }
    
       const message = buffer.subarray(4, 4 + messageLength).toString('utf8')
       console.log('message : ' , JSON.parse(message))
       buffer = buffer.subarray(4 + messageLength);
     }
  })
})


server.listen(4545, () => {
    console.log('Server listening on port 4545')
})
