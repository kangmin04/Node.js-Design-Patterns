// 1. "할 일" (Job): 1초 후에 결과를 반환하는 비동기 함수
function asyncJob(value) {
    console.log(`(Job) 시작: ${value}`);
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`(Job) 완료: ${value}`);
        resolve(value * 2);
      }, 1000);
    });
  }
  
  // 2. "지도" (Generator): 할 일들의 순서를 정의
  function* myFlow() {
    console.log('(Generator) 시작');
  
    // 러너에게 asyncJob(10) 이라는 '할 일(Promise)'을 던지고 멈춤
    // 러너가 일을 끝내고 결과를 next()에 담아주길 기다림
    const result1 = yield asyncJob(10);
    console.log(`(Generator) 첫 번째 결과 받음: ${result1}`); // 러너로부터 20을 받음
  
    const result2 = yield asyncJob(result1); // 받은 결과 20으로 새 '할 일'을 만들어 던짐
    console.log(`(Generator) 두 번째 결과 받음: ${result2}`);
  
    console.log('(Generator) 끝');
    return result2;
  }
  
  // 3. "운전자" (Runner): 제너레이터를 실행하고, 던져진 할 일을 처리함
  async function run(generator) {
    const iterator = generator(); // 이터레이터 생성

    let result = { value: undefined, done: false };
    while (!result.done) {
      // 제너레이터가 던진 '할 일(Promise)'을 받아서 실행하고 기다림
      console.log('(Runner) Generator에게서 Job(Promise)을 받음');
      const jobResult = await result.value;
      console.log(`(Runner) Job 처리 완료, 결과: ${jobResult}`);
  
      // 처리 결과를 제너레이터에게 전달하며 다음 yield까지 실행시킴
      result = iterator.next(jobResult); //result.value = asyncJob들어감
      //enxt(args)로 전달되는 인자는 제너레이터에서 멈춘 yield 표현식의 값이 됨. 
      //즉, const result1 = yield asyncJob(10)에서 result1 = args가 됨
      //그렇기에 첫번째 호출에서 next()는 멈춘 yield가 없기에 전달이 안된다. 
    }
  
    console.log('(Runner) 모든 Flow 완료!');
    return result.value;
  }
  
  // 실행
  run(myFlow);