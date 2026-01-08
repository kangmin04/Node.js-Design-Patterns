import { Readable } from 'node:stream'
import Chance from 'chance' // v1.1.12
const chance = new Chance()
let emittedBytes = 0

//클래스 상속보다 더 간편하게 생성자에 객체를 전달하여 인스턴스의 동작을 정의하는 방법.. [설정객체 패턴 , 옵션 패턴]
//사실 new Promise((resolve) => {})와 동일하다. 

const randomStream = new Readable({
  read(size) {
    const chunk = chance.string({ length: size })
    this.push(chunk, 'utf8')
    emittedBytes += chunk.length
    if (chance.bool({ likelihood: 50 })) {
      this.push(null)
    }
  },
})
// now you can read data from the randomStream instance directly ...

randomStream
.on('data', chunk => {
    console.log(`Chunk received (${chunk.length} bytes): ${chunk.toString()}`)
  })
  .on('end', () => {
    console.log(`Produced ${randomStream.emittedBytes} bytes of random data`)
  })