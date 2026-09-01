/*
    factory 적용 안한경우 :
    FileLogger/ConsoleLogger는 실제 구현 없이 개념 설명을 위한 가상의 클래스다.
*/
/* eslint-disable no-undef -- 개념 설명용 가상 클래스, 실행 대상 아님 */
let logger;
if (process.env.NODE_ENV === 'production') {
  logger = new FileLogger();
} else {
  logger = new ConsoleLogger();
}
logger.log('Some message');

//------------------------------------------------------------//------------------------------------------------------------

/*
    팩토리 적용한 경우. 
    consumer단계라 할수있는 myService가 깔끔해짐. 
    복잡한 로직은 전부 팩토리 함수 내에서 구현. 
*/
// loggerFactory.js
function createLogger() {
  if (process.env.NODE_ENV === 'production') {
    return new FileLogger(); // 복잡한 설정은 여기서 처리
  }
  return new ConsoleLogger();

}
  // myService.js
const loggerA = createLogger(); // 팩토리가 알아서 적절한 로거를 줌
loggerA.log('Some message');