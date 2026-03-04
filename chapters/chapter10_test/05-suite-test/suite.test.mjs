import {test, suite, describe, it} from 'node:test'

suite('Top level suite' , {concurrency: true} , () => {
    test('Subtest 1', () => {})
    test('Subtest 2', () => {})
})

/*
    Suite는 관련된 테스트들을 하나의 그룹으로 묶어 구조화하는 논리적인 단위
    suite = describe, test= it (다른 언어, 프레임워크에서 주로 사용되는 방식)
*/

// describe('Top level suite' , {concurrency: true} , () => {
//     it('Subtest 1', () => {})
//     it('Subtest 2', () => {})
// })
