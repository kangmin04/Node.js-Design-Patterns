import { test, mock, suite } from 'node:test';
import assert from 'node:assert';

suite('mock test' , () => {
    test('mock.fn 예제', () => {
        // 아무 로직이 없는 가짜 함수 생성
        const myFn = mock.fn();
        myFn(1, 'a');
      
        // 가짜 함수에 실제 구현을 제공
        const sum = mock.fn((a, b) => a + b);
        sum(3, 4);
        console.log(sum.mock.calls[0].arguments)
        console.log(sum.mock.calls[0].result)
      });

    test.todo('mock.calls 예제', () => {
        // mock.fn으로 함수를 정의할수도있음
        const myFn = mock.fn((name) => `hello ${name}`);
      
        myFn('world');
        myFn('Gemini');
      
        // 1. 총 호출 횟수 확인
        assert.strict.equal(myFn.mock.callCount(), 2);
      
        // 2. 첫 번째 호출의 인자 확인
        assert.deepStrictEqual(myFn.mock.calls[0].arguments, ['world']);
      
        // 3. 두 번째 호출의 결과 값 확인
        assert.strict.equal(myFn.mock.calls[1].result, 'hello Gemini');
      });
    })
