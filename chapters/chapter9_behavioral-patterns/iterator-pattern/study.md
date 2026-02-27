데이터 내부 구조를 숨기고 요소를 순회하게하는 공통된 방법을 제공함 

Infinite iterator - 무조건 종료될 때 done : true할 필요없음. 
끝이없는 데이터 스트림 만들수도있다. 
피보나치나 pi계산하는 등등... 

 stateful - 
 클로져 OR 인스턴스 변수
다음처럼 currcode를 함수내부에서 변수로 정의하여 외부에서 조작 못하게 할수있음 . 단점은 디버깅 시 내부 상태 보기 어려움 
OR 객체의 속성으로 this.current 처럼 저장해도 됨 

function createAlphabetIterator() {
  let currCode = A_CHAR_CODE

  return {
    next() {
      const currChar = String.fromCodePoint(currCode)
`~~}}
}

이터레이터 소바
1. 고수준 - for of , ... (전개연산자) 등 사용 
2. 저수준 - 직접 iterator.next() 호출하고 done여부 체크 



1. 이터러블 프로토콜(Iterable Protocol)이란?
이터러블 프로토콜은 객체가 반복 가능한 구조를 가질 수 있도록 정의된 표준 약속입니다.

이터러블(Iterable): 이터레이터를 반환하는 [Symbol.iterator] 메서드를 가진 객체를 말합니다.

구현 방법: 객체 내부에 @@iterator라고 불리는 특수한 심볼 메서드인 Symbol.iterator를 구현해야 합니다.

class Iterable {
  //다른 메서드들 
  [Symbol.iterator]() {
    //iterator 리턴함
  }
}


목적: 배열(Array), 세트(Set), 맵(Map)과 같은 표준 내장 객체뿐만 아니라, 사용자가 직접 만든 객체(예: 파일 시스템, 데이터베이스 결과 세트)도 일관된 방식으로 순회할 수 있게 합니다.

객체가 이터러블 프로토콜을 준수하면 JS엔진은 해당 객체를 반복 ㄱㄴ한 대상으로 인지함 

구현된 이터레이터 내부에서 메서드로 Symbol.iterator 추가하고 스스로를 리턴한다면 -> 이터러블로 사용가능 -> for of , ... 에서 고수준으로 사용가능 ! 
이터레이터에 이터러블 구현하는건 권장되는 관행! 
next 직접 호출로 미세하게 제어 OR for of  둘다 가능함. -> Interoperability 극대화


/* Iterator prototype 상속 */

- instanceof Iterator: 객체가 이터레이터인지 런타임에 쉽게 확인할 수 있습니다.
- 상속된 유틸리티: map(), filter(), take(), drop() 등 강력한 헬퍼 메서드를 사용할 수 있습니다.
- 이터러블 이터레이터: Iterator를 상속받으면 자동으로 [Symbol.iterator]가 구현되어 for...of나 전개 연산자(...)를 즉시 사용할 수 있습니다. -
( - Iterator prototype은 iterable protocol을 뒤에서 구현해줌 )
