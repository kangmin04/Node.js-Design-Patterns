import {createServer} from 'node:net'
import {createWriteStream} from 'node:fs'
function demultiplexChannel(source, destinations) {
    let currentChannel = null
    let currentLength = null
    source
      .on('readable', () => { 
        let chunk
        if (currentChannel === null) { 
          chunk = source.read(1)
          currentChannel = chunk?.readUInt8(0)
          if(currentChannel === null) return null; 
        }

        if (currentLength === null) {
            chunk = source.read(4); 
            currentLength = chunk?.readUInt32BE(0)
            if(currentLength === null) return null;
        }

        chunk = source.read(currentLength)
        if(chunk ===null){
            return null
        }

        console.log(`Received packet from: ${currentChannel}`)
        destinations[currentChannel].write(chunk); 
        currentChannel = null
        currentLength = null
      })
    }

const server = createServer(socket => {  //TCP 서버 생성.
  //클라이언트가 서버와 연결시 (connect)  새로운  socket 객체 생성 후 콜백함수 실행. 
  //socket 통해서 데이터 수신 송신 가능
    const stdoutStream = createWriteStream('stdout.txt')
    const stderrStream = createWriteStream('stderr.txt')

    demultiplexChannel(socket , [stdoutStream , stderrStream])
}
)

server.listen(3000 , () => {
    console.log('Server listening on port 3000')
})
