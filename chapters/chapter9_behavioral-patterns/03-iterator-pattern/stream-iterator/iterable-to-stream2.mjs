import { Readable } from 'node:stream';
import { setTimeout } from 'node:timers/promises';

// 1초마다 숫자를 생성하는 비동기 제너레이터
async function* generateNumbers() {
  for (let i = 1; i <= 3; i++) {
    await setTimeout(1000); // 1초 대기
    yield `Number ${i}`;
  }
}

// 비동기 이터러블로부터 Readable 스트림 생성
//아직 실행안됨
const asyncStream = Readable.from(generateNumbers());

console.log('Starting async stream...');

// 비동기 제너레이터가 값을 yield 할 때마다 'data' 이벤트 발생
//on으로 등록하는 순간 , asyncStream에서 데이터를 기다릴 소비자가 생겼다 생각하고 데이터를 flow 시킴 
//flowing mode에선 자동으로 generator.next()를 실행시킴
//1초후 yield 로 value :  ,done :  형식으로 반환할텐데 받은 value를 asyncStream 내부로 push 하여 data 이벤트 발생시킴 
//스트림은 여전히 flow mode라 직후 바로 next 호출함
//제너레이터가 모든 yield 마치고 done: true  반환 시 readable.from의 내부로직은 스트림 끝을 알리기 위해 push(null)로 end 발생 
asyncStream.on('data', (chunk) => {
  console.log(`Received: ${chunk}`);
});

asyncStream.on('end', () => {
  console.log('Async stream finished.');
});