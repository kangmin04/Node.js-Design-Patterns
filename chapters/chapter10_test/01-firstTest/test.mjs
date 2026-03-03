import {equal} from 'node:assert/strict'  //strict 없는건 deprecated
import { calculateBasketTotal } from './calculateBasketTotal.mjs'

/* arange */
const basket = {
    items: [
      { name: 'Croissant', unitPrice: 2, quantity: 2 },
      { name: 'Olive bread', unitPrice: 3, quantity: 1 },
    ],
  }
  
  /* act: execute SUT(calculate function) */
  const result = calculateBasketTotal(basket)

  /* assert */
  const expectedResult = 7;
  /*
    equal function: 값 비교 후 같으면 pass -> 이후 라인이 실행됨
    다르면 마지막 인자인 콜백 메세지 출력 (어떤 err인지 state 하기위해 descriptive하게 작성하자)

    equal은 두 값이 같은 primitive values이자 same content여야만 equal이라고 함. 
    두 값이 객체라면 참조하는 메모리가 같아야만 같은 값으로 취급. 즉, 같은 구조에 같은 내용을 담아도 참조 주소가 다르면 다른 값이라고 판단
    객체의 구조, 내용만 같아도 같다고 출력하려면 deepEqual() 사용하자

    equal판단 여부 -> shallow comparison으로 === 연산자와 유사 ㅛㅗ

    +) 일반 equal 은 shallow copy와 유사. 
    객체에 대해 shallow copy를 하면 객체의 최상위 수준의 속성만 복사 
    -> 속성값이 primitive면 값 그대로 복사되지만 객체면 메모리 참조만 복사됨 
    -> 내부 객체를 공유하게 되어 shallow copy 속성 변경 시 원본도 변경됨. 
    
    

    deepEqual 은 deep copy유사 
    객체 내부 모든 속성 및 중첩된 객체까지 재귀적 복사 
    -> 서로 다른 객체라 영향 안줌. 

    deepcopy 판단 알고리즘 : 
    1. objA === objB로 동일 참조인지 확인
    2. 각 obj 가 object 및 null 아닌지 확인 -> primitive 인지파악 
    3. Object.keys()로 각 객체 키 개수 파악 -> 다르면 객체 구조가다른것이기에 false
    4. 한 obj 요소로 다른 객체 순회하다가 객체 만나면 또 재귀적으로 1번부터 실행 

  */
  equal(
    result,
    expectedResult,
    `Expected total to be ${expectedResult}, but got ${result}`
  )

  console.log('test passed')