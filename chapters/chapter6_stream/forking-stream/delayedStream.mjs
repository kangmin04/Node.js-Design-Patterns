import { createReadStream, createWriteStream, existsSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Transform } from 'node:stream'

// 3. 실행을 위해 filename이 없으면 임시파일을 만듭니다.
const filename = process.argv[2] || 'file.txt'
if (!existsSync(filename)) {
  console.log(`Creating dummy file: ${filename}`)
  writeFileSync(filename, 'Node.js is a powerful runtime environment. '.repeat(5))
}

const sha1Stream = createHash('sha1').setEncoding('hex')

const slowDelayStream = new Transform({
    transform(chunk , _enc , cb){
        setTimeout(() => {
            this.push(chunk); 
            cb();  
        } , 20)
    }
})

const inputStream = createReadStream(filename, { highWaterMark: 20 }) // 청크 크기를 작게 하여 여러번 호출되게 함
inputStream.on('data' , (chunk) => {
    console.log('chunk bytes : ' , chunk.length)
})

inputStream
    .pipe(sha1Stream)
    .on('finish' , () => console.log('sha1 done'))

inputStream
    .pipe(slowDelayStream)
    .on('finish', () => {
      console.log('🎉 slow stream has finished processing all data!')
    })