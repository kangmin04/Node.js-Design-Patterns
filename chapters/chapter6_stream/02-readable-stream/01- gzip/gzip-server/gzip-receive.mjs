import {createServer} from 'node:http'
import { createWriteStream } from 'node:fs'
import { createGunzip } from 'node:zlib' //decompress
import { basename , join } from 'node:path' //basename returns last portion of url


// @params
// req : compressed data

const server = createServer((req , res) => {
    const filename = basename(req.headers['x-filename'])
    const destFilename = join(import.meta.dirname , 'received_files' , filename)
    console.log('File req received' , filename)
    req
    .pipe(createGunzip())
    .pipe(createWriteStream(destFilename))
    .on('finish' , () => {
        res.writeHead(201 , {'content-type' : 'text/plain'})
        res.end('OK\n')
        console.log('file Saved' , destFilename); 
    })
})

server.listen(3000, () => console.log('Listening on http://localhost:3000'))