function* myGenerator() {
    const name = yield 'What is your name?'; // 1. 여기서 멈추고 'What is your name?'을 반환
    console.log(`Generator received name: ${name}`);
  
    const age = yield 'How old are you?';   // 3. 여기서 멈추고 'How old are you?'를 반환
    console.log(`Generator received age: ${age}`);
  
    return 'Done';
  }
  
  const iterator = myGenerator();
  
  // 제너레이터 시작, 첫 yield에서 멈춤
  const question1 = iterator.next().value;
  console.log(question1); // 출력: What is your name?
  
  // 멈췄던 yield에 'Alice'를 전달하며 제너레이터 재개
  const question2 = iterator.next('Alice').value; // 2. 'Alice'가 name 변수에 할당됨
  console.log(question2); // 출력: How old are you?
  
  // 멈췄던 yield에 30을 전달하며 제너레이터 재개
  const finalResult = iterator.next(30).value; // 4. 30이 age 변수에 할당됨
  console.log(finalResult); // 출력: Done
  