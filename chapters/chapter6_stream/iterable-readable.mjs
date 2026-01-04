import { Readable } from 'node:stream'
const mountains = [
  { name: 'Everest', height: 8848 },
  { name: 'K2', height: 8611 },
  { name: 'Kangchenjunga', height: 8586 },
  { name: 'Lhotse', height: 8516 },
  { name: 'Makalu', height: 8481 }
]

const mountainsStream = Readable.from(mountains)

//Readable.from() 은 사실 다음 코드의 간소화다. 

// let index = 0;
// const mountainsStream = new Readable({
//   objectMode: true, // 객체를 다루기 위해 필수!
//   read() {
//     if (index < mountains.length) {
//       this.push(mountains[index]); // 배열에서 하나씩 꺼내 push
//       index++;
//     } else {
//       this.push(null); // 배열이 끝나면 스트림 종료
//     }
//   }
// });


mountainsStream.on('data', (mountain) => {
  console.log(`${mountain.name.padStart(14)}\t${mountain.height}m`)
})