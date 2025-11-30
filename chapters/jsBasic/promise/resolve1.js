const resolvedPromise = Promise.resolve([1,2,3]); 
resolvedPromise.then(console.log)  //then은 프로미스가 성공적으로 이행됐을 때 실행할 콜백함수를 인자로 받음 . 
//프로미스가 이행되면 그 결과인 [1,2,3] 이 .then에 전달된 콜백함수 ( console.log) 의 첫번째 인자로 자동으로 전달된다. 
// --> resolvedPromise.then(v => {console.log(v)}) 와 동일하게 ㅅ작동한다. 