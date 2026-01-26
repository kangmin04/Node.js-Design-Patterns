import { ImmutableBuffer } from './immutableBuffer.mjs'
const hello = 'Hello!'

const immutable = new ImmutableBuffer(hello.length,
  ({ write }) => { //   이 함수가 executor.... 
    write(hello)
  } 
)
console.log(String.fromCharCode(immutable.readInt8(0))) // 2
// the following line will throw
// "TypeError: immutable.write is not a function"
// immutable.write('Hello?') // 3