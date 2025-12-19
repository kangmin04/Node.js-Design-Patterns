const resolvedPromise = Promise.resolve([1,2,3]); 
resolvedPromise.then(console.log)  //then은 프로미스가 성공적으로 이행됐을 때 실행할 콜백함수를 인자로 받음 . 
//프로미스가 이행되면 그 결과인 [1,2,3] 이 .then에 전달된 콜백함수 ( console.log) 의 첫번째 인자로 자동으로 전달된다. 
// --> resolvedPromise.then(v => {console.log(v)}) 와 동일하게 ㅅ작동한다. 


//promise에 promise 전달 -> 전달된 프로미스 그대로 반환
const newPromise = Promise.resolve(resolvedPromise);
newPromise.then(console.log) //

const workingThenable = {
    // 1. then 메서드는 resolve, reject를 인자로 받습니다.
    then: function(resolve, reject) {
    //   console.log("thenable의 then 메서드가 실행됩니다.");
    //   // 2. 비동기 작업이 끝난 후, resolve를 호출하여 프로미스를 이행시킵니다.
    //   setTimeout(() => {
    //     resolve("thenable이 성공적으로 완료되었습니다!");
    //   }, 1000);
        resolve('a')
    }
  };
  
  // workingThenable을 기반으로 새로운 프로미스를 생성합니다.
  const promiseFromThenable = Promise.resolve(workingThenable);
  
  // 이제 이 프로미스는 1초 후에 성공적으로 이행됩니다.
  promiseFromThenable.then(message => {
    console.log(message); // "thenable이 성공적으로 완료되었습니다!" 출력
    console.log(promiseFromThenable)
  });

