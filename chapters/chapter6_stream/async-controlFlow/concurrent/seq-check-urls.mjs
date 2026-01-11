//sequential way of check-urls

import { createInterface } from 'node:readline'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
const inputFile = createReadStream(process.argv[2]) // 1
const fileLines = createInterface({ // 2
  input: inputFile,
})

const checkUrls = new Transform({
    async transform(file , _enc , done){ 
        if(!file){
            return done()
        }
        try {
            await fetch(file , {
                method : 'HEAD' , 
                timeout : 5000 , 
                signal : AbortSignal.timeout(5000) , 
            })
            this.push(`${file} is up\n`)   //simple ver이여도 this.push해야함
            
        } catch (error) {
            this.push(`${file} is down\n`)
        }
        done()
        
    } , flush(done){
        done(); 
    }
})

const outputFile = createWriteStream('result.txt')
await pipeline(fileLines , checkUrls , outputFile)
console.log('All urls have been checked')
