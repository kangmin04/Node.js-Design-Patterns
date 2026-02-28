import { Readable } from 'node:stream';

const array = ['Node.js', 'is', 'awesome'];

// 배열(이터러블)로부터 Readable 스트림을 생성
const readableStream = Readable.from(array);

// 이제 이 스트림은 표준 스트림처럼 동작합니다.
readableStream.on('data', (chunk) => {
  console.log(chunk);
});

readableStream.on('end', () => {
  console.log('Stream finished.');
});

// 또는 .pipe()를 사용할 수도 있습니다.
// Readable.from(array).pipe(process.stdout);