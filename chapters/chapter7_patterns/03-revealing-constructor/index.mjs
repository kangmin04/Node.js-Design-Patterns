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
// immutable.write('Hello?') // 
//write메서드는 modifiers 객체에만 담겨 생성자 내부의 executor함수에 일시적으로 전달됬을 뿐,, 
//imutable 인스턴스에는 할당안됨. 