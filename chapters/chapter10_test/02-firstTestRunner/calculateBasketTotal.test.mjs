/*
    test file name convention -> filename.test.js
    test파일 위치는 상관없음. 보통 해당 테스트 대상과 파일이 같은 디렉토리에 위치시킴
*/
import {equal} from 'node:assert/strict' 
import {test} from 'node:test'
import { calculateBasketTotal } from './calculateBasketTotal.mjs'

/* test 내부의 함수: function under test (FUT) */
test('Calculates basket total' , () => { 
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
  equal(
    result,
    expectedResult,
    `Expected total to be ${expectedResult}, but got ${result}`
  )
})

/* 
    한 파일에 multiple test도 가능하다.
    ℹ tests 2
    ℹ suites 0
    ℹ pass 1
    ℹ fail 1
    이렇게 나옴
*/
test('Calculate basket total with no items' , () => {
    const basket = {
        items : [] ,
    }

    const result = calculateBasketTotal(basket); 
    const expectedResult = 0; 
    equal(
        result,
        expectedResult,
        `Expected total to be ${expectedResult}, but got ${result}`
      )
})