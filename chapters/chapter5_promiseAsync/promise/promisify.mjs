//#학습 목적의 간단한 프로미스화. 

import { randomBytes } from 'node:crypto';

function promisify(callbackBasedFn) {
    return function promisifiedFn(...args) {
      return new Promise((resolve, reject) => { // 1. 함수 실행하자마자 즉시 프로미스 생성 및 반환
        const newArgs = [ // 2
          ...args, // 3
          (err, result) => { // 4. 새로운 콜백 추가. 
            if (err) {
              return reject(err)
            }
            resolve(result)
          },
        ]
        //randomBytes에 전달할 새로운 arg 만듦. 
        callbackBasedFn(...newArgs) // 5. randomButes 실행하고 비동기 작업이 끝나면 저장해둔 err시 reject(err) , fulfill 시 resolve 실행
      })
    }
  }

// 1. randomBytes 함수를 프로미스 버전으로 변환합니다.
const randomBytesP = promisify(randomBytes); //callbackBasedFn
console.log(randomBytesP); 
// 2. 이제 콜백 대신 .then()을 사용하여 결과를 처리할 수 있습니다.
randomBytesP(32)
  .then(buffer => {
    console.log(`생성된 랜덤 바이트: ${buffer.toString()}`);
  })
  .catch(err => {
    console.error("에러 발생:", err);
  });