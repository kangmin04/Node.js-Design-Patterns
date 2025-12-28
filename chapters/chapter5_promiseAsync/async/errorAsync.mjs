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
       return delayError(1000)  //delayError은 프로미스가 계속 진행 중이고 return을 만나서 errCaught함수는 종료된다. 
       //프로미스가 나중에 reject되도 , 그땐 이미 try를 벗어난것. -> caller에서 err이 catch됨. 
    } catch (err) {
      console.error('Error caught by the async function: ' +
        err.message) }
  }

  errorCaught()
    .catch(err => console.error('Error caught by the caller: ' +
      err.message))
  


   