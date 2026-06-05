function createCounter() {
    // 'count'는 클로저 내에 숨겨진 비공개 변수입니다.
    let count = 0;
  
    // 이 팩토리는 오직 공개하고 싶은 메서드만 담긴 객체를 반환합니다.
    return {
      increment() {
        count++;
      },
      getCount() {
        return count;
      }
    };
  }
  
  const counter = createCounter();
  counter.increment();
  console.log(counter.getCount()); // 1
  
  // 외부에서 'count' 변수에 직접 접근하거나 수정하는 것은 불가능합니다.
  console.log(counter.count); // undefined
  counter.count = 100; // 아무 효과 없음
  console.log(counter.getCount()); // 여전히 1