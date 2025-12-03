
import { EventEmitter } from 'node:events';

// // 이 예제는 이벤트 리스너를 적절히 제거하지 않았을 때 발생하는 메모리 누수를 보여줍니다.

// // --- 메모리 누수 시나리오 ---

// // 1. 애플리케이션 전역에서 사용되는 긴 생명주기를 가진 EventEmitter
// const leakyEmitter = new EventEmitter();
// // MaxListenersExceededWarning 경고를 피하기 위해 리스너 제한을 일시적으로 늘립니다.
// leakyEmitter.setMaxListeners(100);

// let requestCounter = 0;

// // 2. 요청을 처리하는 함수 (예: 웹 서버의 요청 핸들러)
// function processRequest(requestId) {
//   // 각 요청마다 큰 데이터가 메모리에 생성된다고 가정합니다.
//   const largeData = {
//     id: requestId,
//     payload: 'A'.repeat(10 * 1024), // 10KB의 가상 데이터
//   };

//   // 3. (문제의 부분) 일회성 작업을 위해 이벤트 리스너를 등록합니다.
//   // 이 리스너는 largeData에 대한 클로저를 형성하여 largeData를 참조합니다.
//   const listener = (data) => {
//     // 실제로는 이 리스너가 복잡한 작업을 할 수 있습니다.
//     // console.log(`Processing complete for request: ${largeData.id}, data: ${data}`);
//   };

//   leakyEmitter.on('request_done', listener);

//   // 시뮬레이션: 잠시 후 작업이 완료되었다고 가정하고 이벤트를 발생시킵니다.
//   setTimeout(() => {
//     leakyEmitter.emit('request_done', `Processed payload for ${requestId}`);
    
//     // 4. (실수!) 여기서 리스너를 제거해야 하지만, 하지 않았습니다!
//     // 올바른 코드: 
//     leakyEmitter.off('request_done', listener);
    
//   }, 100);

//   // console.log(`Request #${requestId} is being processed.`);
// }

// // 5. 0.5초마다 새로운 요청이 들어오는 것을 시뮬레이션합니다.
// setInterval(() => {
//   requestCounter++;
//   processRequest(requestCounter);

//   // 6. 누수 확인: 리스너의 수가 계속 증가하는 것을 확인합니다.
//   // 각 리스너는 largeData 객체를 참조하므로, 가비지 컬렉터가 메모리를 회수할 수 없습니다.
//   console.log(
//     `[Leaky Emitter] Requests: ${requestCounter}, Listeners: ${leakyEmitter.listenerCount('request_done')}`
//   );
// }, 500);


// --- 올바른 패턴 시나리오 (메모리 누수 방지) ---

const cleanEmitter = new EventEmitter();

function processRequestCorrectly(requestId) {
  const largeData = {
    id: requestId,
    payload: 'B'.repeat(10 * 1024),
  };

  // 'once'를 사용하면 이벤트가 한 번 발생한 후 리스너가 자동으로 제거됩니다.
  // 이것이 일회성 리스너를 위한 가장 안전하고 쉬운 방법입니다.
  cleanEmitter.once('request_done', (data) => {
    // console.log(`[Clean] Processing complete for request: ${largeData.id}, data: ${data}`);
  });

  setTimeout(() => {
    cleanEmitter.emit('request_done', `Processed payload for ${requestId}`);
  }, 100);
}

setInterval(() => {
  processRequestCorrectly('clean_request');
  // 리스너 수가 1을 넘지 않는 것을 확인할 수 있습니다. (emit 직전에는 1, 직후에는 0)
  console.log(
    `[Clean Emitter] Current listener count: ${cleanEmitter.listenerCount('request_done')}`
  );
}, 2000);
