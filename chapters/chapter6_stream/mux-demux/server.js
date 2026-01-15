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

const server = createServer(socket => {
    const stdoutStream = createWriteStream('stdout.txt')
    const stderrStream = createWriteStream('stderr.txt')

    demultiplexChannel(socket , [stdoutStream , stderrStream])
}
)

server.listen(3000 , () => {
    console.log('Server listening on port 3000')
})
