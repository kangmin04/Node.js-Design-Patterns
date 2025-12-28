function delayError(milliseconds) {
    return new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Error after ${milliseconds}ms`))
      }, milliseconds)
    })
  }

//async function은 항상 프로미스를 리턴함. 
//함수 내부에서 값 반환하면 Promise.resolve(값)반환. 
//try catch는 동기코드만 잡아줌. (현재 실컨에서 실제로 throw되는 에러에 대해서만 .. )
  async function errorCaught() {
    try {
       return await delayError(1000)  //await으로 인해 → Promise가 resolve 또는 reject될 때까지 현재 async 함수가 멈춤
    } catch (err) { //local 내부 에러 catch에서 잡힘. 
      console.error('Error caught by the async function: ' +
        err.message) }
  }

  errorCaught()
    .catch(err => console.error('Error caught by the caller: ' +
      err.message))
  


   