for await (const chunk of process.stdin) {
    console.log('New data available');
    console.log(`Chunk read (${chunk.length} bytes): "${chunk.toString()}"`);
  }
  console.log('End of stream');


  //readable stream : async iterator
// process.stdin에서 데이터 chunk가 가능해질 때까지 코드 실행 중지됨.
//스트림에서 chunk 도착하면 루프 내부 실행. 