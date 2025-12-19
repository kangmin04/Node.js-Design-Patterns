// function waitFor(ms) {
//     // resolve 함수는 new Promise 생성자 스코프 안에서만 사용 가능
//     return new Promise(resolve => {
//       setTimeout(() => {
//         resolve();
//       }, ms);
//     });
//   }
  
//   await waitFor(1000); // 1초 기다림

function withResolvers() {
    let resolve;
    let reject;
  
    // 1. 프로미스를 생성하면서, 내부의 resolve와 reject를
    //    바깥의 변수에 할당합니다.
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
  
    // 2. 프로미스와 외부로 노출된 함수들을 함께 반환합니다.
    return { promise, resolve, reject };
  }


  
  async function run() {
    // 1. 프로미스와 제어 함수들을 먼저 생성합니다.
    const { promise, resolve } = Promise.withResolvers();
  
    // 2. 콜백이 있는 곳에 resolve 함수를 전달합니다.
    //    (스코프가 완전히 달라도 상관없습니다)
    setTimeout(() => {
      console.log("1초가 지났습니다. 이제 프로미스를 완료합니다.");
      resolve("작업 완료!"); // 외부의 resolve 함수를 호출
    }, 1000);
  
    console.log("프로미스가 완료되기를 기다립니다...");
  
    // 3. 이제 이 프로미스를 await 할 수 있습니다.
    const result = await promise;
  
    console.log("결과:", result); // "결과: 작업 완료!" 출력
  }
  
  run();