function delay(ms) {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Promise가 reject 되었습니다!')), ms);
    });
  }
  
  async function handleAsyncError() {
    console.log('비동기 작업 시작...');
    try {
      await delay(1000); // Promise가 reject되면 await가 에러를 throw한 것처럼 동작
    } catch (err) {
      console.log('async/await와 함께 try...catch로 비동기 에러를 잡았습니다!');
      console.error(err.message);
    }
  }
  
  handleAsyncError();

  console.log('동기 코드 1')
  process.nextTick(() => {
    console.log('nextTick 1')
  })

  /*
    실행 컨텍스트 (Execution Context): 코드가 실행되는 환경을 의미합니다. 함수가 호출될 때마다 해당 함수를 위한 실행 컨텍스트가 생성됩니다. 이 컨텍스트에는 함수 내의 변수, 스코프 체인, this 값 등의 정보가 담깁니다.
    호출 스택 (Call Stack): 프로그램의 실행 흐름을 추적하는 자료구조입니다. 함수가 호출되면 해당 함수의 실행 컨텍스트가 스택의 맨 위에 쌓이고(push), 함수 실행이 끝나면 스택에서 제거됩니다(pop). LIFO(Last-In, First-Out) 구조입니다.
    try...catch는 동기적인 코드의 에러를 처리하기 위해 설계되었습니다.

    함수 호출 및 스택 쌓기:
        functionA()가 호출됩니다. functionA의 실행 컨텍스트가 호출 스택에 들어갑니다.
        functionA 내부에서 functionB()를 호출합니다. functionB의 실행 컨텍스트가 스택의 맨 위에 쌓입니다.
        functionB 내부에서 functionC()를 호출합니다. functionC의 실행 컨텍스트가 스택의 맨 위에 쌓입니다.
    현재 호출 스택:

    [ functionC ]  <- 현재 실행 중
    [ functionB ]
    [ functionA ]


    에러 발생 (throw):

        functionC 내부에서 throw new Error(...)가 실행됩니다.
        이 순간, 정상적인 코드 실행이 즉시 중단됩니다.
        JavaScript 런타임은 현재 실행 컨텍스트(functionC)에서 이 에러를 처리할 catch 블록이 있는지 찾습니다.
        스택 되감기 (Stack Unwinding) 및 전파:

        functionC에는 catch 블록이 없습니다.
        런타임은 functionC의 실행을 완전히 종료하고, 호출 스택에서 functionC의 실행 컨텍스트를 제거(pop)합니다. 이 과정을 **"스택 되감기(Stack Unwinding)"**라고 합니다.
        에러는 이제 호출 스택의 바로 아래에 있던 functionB로 전파됩니다.
    현재 호출 스택:

        [ functionB ] <- 에러가 여기로 전파됨
        [ functionA ]


    런타임은 functionB의 실행 컨텍스트에서 에러를 처리할 catch 블록을 찾습니다. functionB에도 catch가 없습니다.
    functionB의 실행도 중단되고 스택에서 제거(pop)됩니다. 에러는 다시 그 아래인 functionA로 전파됩니다.
    
    에러 처리 (catch):
        에러가 functionA로 전파되었습니다.
        런타임은 functionA의 실행 컨텍스트를 확인하고, functionB() 호출이 try...catch 문 안에 감싸여 있는 것을 발견합니다.
        try 블록의 실행이 중단되고, 프로그램의 제어권이 즉시 해당 catch 블록으로 넘어갑니다. 발생한 Error 객체는 catch 블록의 매개변수(err)로 전달됩니다.
        catch 블록 내부의 코드가 실행되고, 에러 처리가 완료됩니다. catch 블록에서 다시 에러를 throw하지 않는 한, 에러 전파는 여기서 멈추고 프로그램은 catch 블록 다음 코드부터 정상적으로 실행을 이어갑니다.

  */