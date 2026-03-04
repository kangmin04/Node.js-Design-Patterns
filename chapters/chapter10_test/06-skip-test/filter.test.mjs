/*
    방법1. test name을 argument로 줘서 스킵
    node --test --test-name-pattern="Test 2" -> Test 2만 실행 
    node --test --test-name-pattern="suite 1" -> suite 1만 실행 // 대소문자 상관없음

    node --test --test-skip-pattern="suite 2" -> suite 2 스킵하고 1만 실행. Node 20 ver에선 안되는듯
 */
import {test, suite} from 'node:test'

suite('Top level suite 1' , {concurrency: true} , () => {
    test('Test 1', () => {})
    test('Test 2', () => {})
})

suite('Top level suite 2' , {concurrency: true} , () => {
    test('Test 1', () => {})
    test('Test 2', () => {})
})

/*
    방법2. skip: true 옵션
    suite에 skip 주거나, test에 skip 가능
    
    방법3. only: true 옵션
    해당 suite OR test만 실행함 
    이때, 실행하려면 command flag로 --test-only 줘야함
*/



suite('Top level suite 1' , {concurrency: true, skip: true} , () => {
    test('Test 1', () => {})
    test('Test 2', () => {})
})

suite('Top level suite 2' , {concurrency: true} , () => {
    test('Test 1', {skip: true}, () => {})
    test('Test 2', {only: true} , () => {})
})