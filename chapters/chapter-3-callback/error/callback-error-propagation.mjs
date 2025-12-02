// callback-error-propagation.mjs
import { readFile } from 'node:fs';

// LEVEL 3: 데이터 파싱 (Callback Style)
// 이 함수는 원시 데이터와 콜백 함수를 인자로 받습니다.
const level3_parseData = (rawData, callback) => {
  console.log("  (L3) 데이터 파싱을 시도합니다...");
  try {
    const parsed = JSON.parse(rawData);
    // 성공: 에러는 null, 파싱된 데이터를 두 번째 인자로 전달
    return callback(null, parsed);
  } catch (err) {
    console.log(`  (L3) 파싱 실패! 에러를 콜백에 담아 전달합니다.`);
    // 실패: 에러 객체를 첫 번째 인자로 전달
    return callback(err);
  }
};

// LEVEL 2: 파일 처리 (Callback Style)
// 이 함수는 파일 이름과 상위 레벨의 콜백 함수를 인자로 받습니다.
const level2_readFileAndParse = (filename, callback) => {
  console.log(` (L2) 콜백 방식으로 \"${filename}\" 파일을 읽습니다...`);
  
  // fs.readFile은 대표적인 콜백 기반 비동기 함수입니다.
  readFile(filename, 'utf-8', (readErr, rawData) => {
    // 2a. 파일 읽기 자체에서 에러가 발생한 경우
    if (readErr) {
      console.log(` (L2) 파일 읽기 실패! 에러를 상위 콜백으로 전달합니다.`);
      // 에러를 가공하여 상위(L1)로 전파
      return callback(new Error(`(L2) 파일 읽기 실패: ${readErr.message}`));
    }

    console.log(" (L2) 파일 읽기 성공. L3 파싱을 시작합니다.");
    // 2b. 파일 읽기는 성공했지만, 파싱에서 에러가 발생하는 경우
    level3_parseData(rawData, (parseErr, parsedData) => {
      if (parseErr) {
        console.log(" (L2) 하위 레벨(L3) 파싱 에러를 감지했습니다.");
        // 에러를 가공하여 상위(L1)로 전파
        return callback(new Error(`(L2) 파일 내용 파싱 실패: ${parseErr.message}`));
      }
      
      console.log(" (L2) 파싱 성공. 최종 데이터를 상위 콜백으로 전달합니다.");
      // 모든 과정이 성공했을 때, 최종 데이터를 상위 콜백으로 전달
      return callback(null, parsedData);
    });
  });
};

// LEVEL 1: 메인 로직 (Callback Style)
const level1_main = () => {
  console.log("(L1) 메인 작업을 시작합니다.");
  const filename = 'invalid-data.json';

  // L2 함수를 호출하며, 모든 비동기 작업이 끝났을 때 실행될 최종 콜백을 전달합니다.
  level2_readFileAndParse(filename, (finalErr, result) => {
    console.log("\n--- (L1) 최종 콜백 실행 ---");
    // 최종적으로 전파된 에러를 이곳에서 처리합니다.
    if (finalErr) {
      console.error(`(L1) 작업 실패: ${finalErr.message}`);
      console.error("--------------------------");
    } else {
      console.log("(L1) 모든 작업이 성공적으로 완료되었습니다.", result);
    }
    console.log("(L1) 메인 작업을 종료합니다.");
  });

  console.log("(L1) 비동기 작업이 시작되었습니다. 결과는 나중에 콜백을 통해 출력됩니다.");
};

// 실행
level1_main();
