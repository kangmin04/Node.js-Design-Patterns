// await-nonblocking-demo.mjs

// 특정 시간 후에 완료되는 Promise를 반환하는 함수
const slowTask = (taskName, delay) => {
  console.log(`[${taskName}] 작업 시작. (소요 시간: ${delay / 1000}초)`);
  return new Promise(resolve => {
    setTimeout(() => {
      console.log(`[${taskName}] 작업 완료!`);
      // resolve(`'${taskName}'의 결과물`);
    }, delay);
  });
};

const main = async () => {
  console.log("메인 함수 시작 🚀");

  // 2초 걸리는 작업을 await 합니다.
  // 이 라인에서 main 함수의 실행이 '일시 중지'되고, 제어권은 이벤트 루프로 넘어갑니다.
  const resultPromise = slowTask('A', 2000);

  console.log("'A' 작업을 await 하기 직전입니다. 이벤트 루프는 다른 일을 할 수 있습니다.");

  // 'A' 작업이 완료되기를 기다리는 동안, 다른 비동기 작업(1초 타이머)이 실행될 수 있습니다.
  setTimeout(() => {
    console.log("\n>>> ⏰ 1초 타이머 실행! 'A' 작업은 아직 끝나지 않았습니다.\n");
  }, 1000);

  const result = await resultPromise; // 여기서 실제로 '일시 중지'하며 결과를 기다립니다.

  console.log(`'${result}'를 받았습니다.`);
  console.log("메인 함수 종료 ✅");
};

main();
