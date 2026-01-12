import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream'
import { randomBytes } from 'node:crypto'
import { createCompressAndEncrypt } from './combined-stream-crypto.mjs'
const [, , password, source] = process.argv
const destination = `${source}.gz.enc`
const iv = randomBytes(16); 

pipeline(
    createReadStream(source) , 
    createCompressAndEncrypt(password , iv) , 
    createWriteStream(destination) , 
    err => {
        if(err){
            console.log(err)
            process.exit(1)
        }

        console.log(`${destination} created with iv : ${iv.toString('hex')}`)
    }
)