import { createServer } from 'node:http'
import Chance from 'chance' // v1.1.12
const chance = new Chance()
const CHUNK_SIZE = 160; 

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' }) // 1
  let backPressureCount = 0 ; 
  let byteSent = 0; 
  (function generateMore(){
    do{
        const chunk = chance.string({length: CHUNK_SIZE});
        const available = res.write(`${chunk}\n`); 
        byteSent+=CHUNK_SIZE
        if(!available){
            console.warn(`back-pressure x${++backPressureCount}`)
            return res.once('drain', generateMore)
        }

    }while(chance.bool({likelihood: 50}))
    res.end(`\n\n-----END------`)
  
  })()

  res.on('finish', () => console.log(`Sent ${byteSent} bytes`))
})

server.listen(3000, () => {
    console.log('listening on http://localhost:3000')
  })
  