import { parentPort } from 'worker_threads';
import vm from 'node:vm';

parentPort.on('message', ({ code, args }) => {
  // 1. 샌드박스 객체 생성(VM 안에서 사용될 "전역" 변수와 객체들을 미리 정의하는 설계도)
  //console 객체를 샌드박스 안으로 전달하여 vm 내부에서 console.log 가능하도록함.
  const sandbox = { console, result: null };

  // 2. 샌드박스 객체를 '컨텍스트화' (재사용 가능한 VM 환경으로 만듦)
  /* 
    sandbox 객체는 V8 가상 머신과 '라이브 링크(Live Link)' 로 연결된 특별한 객체가 됨 
    즉, 이 시점부터 VM 내부에서 sandbox의 속성을 변경하면, 그 변경 사항이 바깥의 sandbox 객체에도 즉시 반영
  */
  vm.createContext(sandbox);

  // 3. 실행할 코드를 동적으로 구성
  /* args 배열을 ['1', '2', '3'] 문자열로 변경하여 실행 */
  /* runInNewContext는 결과를 그냥 리턴했다면, 여기선 미리 지정해둔 샌드박스 객체의 result값을 업데이틀함 */
  const wrappedCode = `
    const fn = ${code};
    result = fn(...${JSON.stringify(args)});
  `;

  // 4. '컨텍스트화'된 샌드박스 안에서 코드 실행
  vm.runInContext(wrappedCode, sandbox, { timeout: 1000 });

  // 5. 샌드박스에 저장된 결과값을 부모 스레드로 전송
  parentPort.postMessage(sandbox.result);

  parentPort.close();
});


