/* STUDY ABOUT LENGTH PREFIX ENCODING + 네트워크 인코딩 시 다른 방법들  */

import { createServer } from 'node:net'

const server = createServer(socket => {
  socket.on('error', err => {
    console.error('Server error', err.message)
  })

  let buffer = Buffer.alloc(0); 
  socket.on('data' , chunk => {
    buffer = Buffer.concat([buffer, chunk])
  })

  while(buffer.length >= 4){
    const messageLength = buffer.readUInt32BE(0); 
    if(buffer.length < 4 + messageLength){
      break; 
   // Check if we have the complete message
   const message = buffer.subarray(4, 4 + messageLength).toString('utf8')
   // Process the message (just log it)
   console.log('Received message:', JSON.parse(message))
   // Remove the processed message from the buffer
   buffer = buffer.subarray(4 + messageLength)
 }
  }})
// Start the server and listen on port 4545
server.listen(4545, () => console.log('Server started'))