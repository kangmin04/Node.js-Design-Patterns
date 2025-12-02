// async-error-propagation.mjs
import { readFile } from 'node:fs/promises';

// LEVEL 3: 데이터 파싱 (비동기 함수일 필요는 없지만, 일관성을 위해 async로)
// 이 함수는 문자열을 받아 JSON 파싱을 시도합니다.
// 여기서 발생한 에러는 호출자(level2_readFile)에게 전파됩니다.
const level3_parseData = async (rawData) => {
  console.log("  (L3) 데이터 파싱을 시도합니다...");
  try {
    const parsed = JSON.parse(rawData);
    console.log("  (L3) 파싱 성공.");
    return parsed;
  } catch (err) {
    console.log(`  (L3) 파싱 실패! 에러 발생: "${err.message}". 이 에러를 상위로 던집니다.`);
    // 에러를 처리하지 않고 다시 던져서 상위 비동기 함수로 전파
    throw err;
  }
};

// LEVEL 2: 파일 읽기 (비동기)
// fs/promises의 readFile을 사용하여 비동기적으로 파일을 읽고, level3 함수를 호출합니다.
// 여기서 발생하는 모든 에러(파일 읽기 실패, 파싱 실패)는 상위로 전파됩니다.
const level2_readFile = async (filename) => {
  console.log(` (L2) 비동기적으로 "${filename}" 파일을 읽습니다...`);
  try {
    const rawData = await readFile(filename, 'utf-8');
    console.log(" (L2) 파일 읽기 성공. 파싱을 시작합니다.");
    // await를 사용하여 하위 함수의 성공/실패(에러)를 기다립니다.
    return await level3_parseData(rawData);
  } catch (err) {
    console.log(" (L2) 하위 레벨(파일 읽기 또는 L3 파싱)에서 에러가 전파된 것을 감지했습니다.");
    // 에러에 추가적인 컨텍스트를 더해 새로운 에러를 만들어 던집니다.
    throw new Error(`(L2) 파일 "${filename}" 처리 중 문제 발생: ${err.message}`);
  }
};

// LEVEL 1: 메인 로직 (비동기)
// 최종적으로 에러를 잡아서 처리하는 곳입니다.
const level1_main = async () => {
  console.log("(L1) 메인 작업을 시작합니다.");
  try {
    // await 키워드 덕분에 level2_readFile 함수에서 발생한 모든 에러를
    // 이 try...catch 블록에서 잡을 수 있습니다.
    const result = await level2_readFile('invalid-data.json');
    console.log("(L1) 모든 작업이 성공적으로 완료되었습니다.", result);
  } catch (err) {
    console.error("--- 최종 비동기 에러 핸들러 ---");
    console.error(`(L1) 메인 작업 실패: ${err.message}`);
    console.error("-------------------------------");
  }
  console.log("(L1) 메인 작업을 종료합니다.");
};

// 실행
level1_main();
