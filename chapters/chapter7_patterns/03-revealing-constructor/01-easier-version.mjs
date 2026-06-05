// 나중에 '전용 리모컨' 역할을 할 변수입니다.
let safeApi;

class SafeNumber {
  // 생성자는 '설치 기사(executor)' 함수를 인자로 받습니다.
  constructor(executor) {
    // 1. 금고 내부의 "아무도 모르는" 비밀 숫자입니다.
    let secretNumber = 100;

    // 2. 금고 내부에서만 동작하는 "비밀 기능"입니다.
    const add = (num) => {
      secretNumber += num;
      console.log(`${num}만큼 더했습니다. (현재 값은 비밀!)`);
    };

    const subtract = (num) => { // 이 기능은 절대 외부에 노출되지 않을겁니다.
      secretNumber -= num;
    };

    // 3. ✨ 여기가 바로 "Revealing" 파트입니다! ✨
    //    생성자(금고)가 잠시 '설치 기사'에게 'add' 기능만 담긴
    //    '전용 리모컨' 객체를 넘겨줍니다.
    executor({
      add: add
      // subtract 기능은 리모컨에 포함시키지 않았습니다!
    });
  }
}

// 4. 이제 금고를 설치해봅시다.
//    '설치 기사' 역할을 하는 함수를 생성자에 전달합니다.
//    이 함수는 '전용 리모컨'을 받아서 바깥의 safeApi 변수에 저장합니다.
const mySafe = new SafeNumber((revealedApi) => {
  console.log('금고 생성 중... 전용 리모컨을 받았습니다!');
  safeApi = revealedApi;
});

console.log('--- 금고 설치 완료! ---');

// 5. 이제 우리는 '전용 리모컨(safeApi)'만 사용할 수 있습니다.
safeApi.add(50); // 출력: 50만큼 더했습니다. (현재 값은 비밀!)
safeApi.add(20); // 출력: 20만큼 더했습니다. (현재 값은 비밀!)

// 아래 코드는 모두 에러가 발생합니다. 리모컨에 없는 기능이기 때문이죠.
// console.log(mySafe.secretNumber); // undefined (직접 접근 불가)
// safeApi.subtract(10);             // TypeError: safeApi.subtract is not a function
