import { createReadStream, createWriteStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { createInterface } from 'node:readline'
const [, , dest, ...sources] = process.argv

const destStream = createWriteStream(dest)

let endCount = 0
for (const source of sources) { // 동기적으로 for 돌리나, 거의 동시에 한 dest를 통해 3개의 pipe가 실행된다. -> 순서대로 안나오는게 당연. 
  const sourceStream = createReadStream(source, { highWaterMark: 16 })
  const linesStream = Readable.from(createInterface({ input: sourceStream }))
  //createInterface: sourceStream으로부터 데이터를 읽어 개행문자 기준으로 잘라서 'line' 이벤트를 발생시키는 인터페이스를 만듦
  //Readable.from(): line 단위로 보내는 readable한 스트림을 만듦. 이떄 한 chunk로 나오는 line은 개행문자가 제거됨. 

  const addLineEnd = new Transform({
    transform(chunk, _encoding, cb) {
      cb(null, `${chunk}\n`)
    },
  })
  sourceStream.on('end', () => {
    if (++endCount === sources.length) {
      destStream.end()
      console.log(`${dest} created`)
    }
  })
  linesStream
    .pipe(addLineEnd) //처음에 이걸 주석했는데 result.txt에 한줄로 나오길래 왜 그런가 했다. 이건 걍 IDE 문제임/ cat으로 파일 출력해보면 전체가 보인다. 
    .pipe(destStream, { end: false }) 
    //end : false 없다면 , 첫번째 소스파일 source[0] 끝나자마자 destStream의 end()룰 호출하여 닫음. 
    //end : false -> 소스 스트림 끝나더라도 목적지 스트림을 닫지말아달락 것. 
}