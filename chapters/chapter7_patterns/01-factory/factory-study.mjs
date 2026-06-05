/*
    factory 적용 안한경우 : 
*/
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