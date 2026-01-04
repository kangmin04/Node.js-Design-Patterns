// resume-pause-example.mjs

console.log('터미널에 텍스트를 입력하세요. 엔터를 누르면 데이터가 전송됩니다.');
console.log('입력된 데이터는 2초간 멈췄다가 다시 입력을 받습니다.');

// 'data' 이벤트 리스너를 등록하여 흐름(flowing) 모드로 전환
process.stdin.on('data', (chunk) => {
  console.log(`\n--- 데이터 수신 ---`);
  console.log(`수신된 내용: "${chunk.toString().trim()}"`);

  // 데이터를 받은 후 스트림을 즉시 일시 중지
  console.log('스트림을 2초간 일시 중지합니다... (pause)');
  process.stdin.pause();

  // 2초 후에 스트림을 다시 시작
  setTimeout(() => {
    console.log('스트림을 다시 시작합니다. (resume)');
    process.stdin.resume();
  }, 2000);
});

process.stdin.on('end', () => {
  console.log('\n--- 스트림 종료 ---');
});
