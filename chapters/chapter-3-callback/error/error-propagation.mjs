// error-propagation.mjs

// LEVEL 3: 데이터 파싱 - 에러가 최초로 발생하는 곳
// 이 함수는 잘못된 형식의 문자열을 받아 JSON 파싱을 시도합니다.
// 여기서 발생한 에러는 호출자(level2_readFile)에게 전파됩니다.
const level3_parseData = (rawData) => {
  console.log("  (L3) 데이터 파싱을 시도합니다...");
  try {
    const parsed = JSON.parse(rawData);
    console.log("  (L3) 파싱 성공.");
    return parsed;
  } catch (err) {
    console.log(`  (L3) 파싱 실패! 에러 발생: "${err.message}". 이 에러를 상위로 던집니다.`);
    // 에러를 처리하지 않고 다시 던져서 상위 함수로 전파
    throw err;
  }
};

// LEVEL 2: 파일 처리 - 중간 레벨
// 이 함수는 level3_parseData를 호출하고, 거기서 발생한 에러를 잡습니다.
// 하지만 이 함수는 에러를 완전히 처리하지 않고, 에러에 추가적인 컨텍스트를 더해
// 다시 상위 함수(level1_main)로 전파합니다.
const level2_readFile = (filename) => {
  console.log(" (L2) 파일을 읽는다고 가정합니다...");
  try {
    // 실제 파일 읽기 대신, 에러를 유발하는 잘못된 JSON 문자열을 사용
    const rawData = '{ "data": "some data", "malformed" }';
    console.log(` (L2) 파일 내용: "${rawData}"`);
    return level3_parseData(rawData);
  } catch (err) {
    console.log(" (L2) 하위 레벨(L3)에서 에러가 전파된 것을 감지했습니다.");
    // 에러를 그냥 다시 던지지 않고, 어떤 파일에서 문제가 생겼는지
    // 컨텍스트를 추가하여 새로운 에러를 만들어 던집니다.
    throw new Error(`(L2) 파일 "${filename}" 처리 중 문제 발생: ${err.message}`);
  }
};

// LEVEL 1: 메인 로직 - 최상위 레벨
// 최종적으로 에러를 잡아서 사용자에게 친화적인 메시지를 보여주는 곳입니다.
const level1_main = () => {
  console.log("(L1) 메인 작업을 시작합니다.");
  try {
    const result = level2_readFile("my-data.json");
    console.log("(L1) 모든 작업이 성공적으로 완료되었습니다.", result);
  } catch (err) {
    console.error("--- 최종 에러 핸들러 ---");
    console.error(`(L1) 메인 작업 실패: ${err.message}`);
    console.error("-----------------------");
    // 여기서 에러 로깅, 사용자에게 알림 등의 최종 처리를 합니다.
  }
  console.log("(L1) 메인 작업을 종료합니다.");
};

// 실행
level1_main();
