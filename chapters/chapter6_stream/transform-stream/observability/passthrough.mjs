import {createReadStream , createWriteStream} from 'node:fs'
import {createGzip} from 'node:zlib'
import { PassThrough } from 'node:stream'


let bytesWritten = 0

const monitor = new PassThrough()

monitor.on('data', chunk => {
  bytesWritten += chunk.length
})

const filename = process.argv[2]; 

createReadStream(filename)
    .pipe(monitor) //for uncompressed   : 9120 bytes
    .pipe(createGzip())
    // .pipe(monitor) //for compressed bytes : 66 bytes
    .pipe(createWriteStream(`${filename}.gz`))
    .on('finish' , () => {console.log('file done')
        console.log('byte Written : ' , bytesWritten)
    })
