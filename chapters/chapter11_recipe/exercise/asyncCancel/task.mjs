// 1. 하위 자식 작업
const childTask = createAsyncCancelable(function* (name) {
  try {
    console.log(`${name} 시작...`);
    yield new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`${name} 완료!`);
    return `Result of ${name}`;
  } finally {
    // 취소 시 이 블록이 실행됨
    console.log(`${name} 자원이 정리되었습니다.`);
  }
});

// 2. 상위 부모 작업
const mainTask = createAsyncCancelable(function* () {
  console.log("메인 작업 시작");
  
  // 하위 cancelable을 yield함 (힌트의 핵심)
  const result1 = yield childTask("자식 1");
  console.log("받은 결과:", result1);

  const result2 = yield childTask("자식 2");
  return "모든 작업 완료";
});

// 실행 테스트
const task = mainTask();

task.promise
  .then(res => console.log("성공:", res))
  .catch(err => console.log("실패:", err.message));

// 1초 뒤에 메인 작업을 취소해봅시다.
setTimeout(() => {
  console.log("--- 메인 작업 취소 시도 ---");
  task.cancel();
}, 1000);