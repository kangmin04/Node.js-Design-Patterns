import { createInterface } from 'node:readline'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { LimitConcurrentStream} from './limit-concurrent-stream.mjs'
const inputFile = createReadStream(process.argv[2]) // 1
const fileLines = createInterface({ // 2
  input: inputFile,
})

const checkUrls = new LimitConcurrentStream( 2 ,async (url , _enc , push , done) => {
    if(!url){
        return done()
    }

    try{
        await fetch(url , {
            method : 'HEAD' ,  //html 등 전체 fetch가 아닌, res , res 정보를 담는 HEAD만 fetch함. 
            timeout : 5000 , 
            signal : AbortSignal.timeout(5000) , //5초뒤에 멈춤
        })
        push(`${url} is up\n`)
    }catch(err){
        push(`${url} is down\n`)
    }
    done()

    }
)

const outputFile = createWriteStream('result.txt')
await pipeline(fileLines , checkUrls , outputFile)
console.log('All urls have been checked')
