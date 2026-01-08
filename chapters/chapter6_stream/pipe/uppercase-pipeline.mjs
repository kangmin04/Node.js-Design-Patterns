import { createGzip, createGunzip } from 'node:zlib' // 1
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const uppercasify = new Transform({
    transform(chunk, _enc, cb) {
        this.push(chunk.toString().toUpperCase())
        cb()
    }
})

try{

    await pipeline( // 3
        process.stdin,
        createGunzip(),
        uppercasify,
        createGzip(),
        process.stdout
    )
}catch(err){
    console.error(err)
    process.exit(1); 
}