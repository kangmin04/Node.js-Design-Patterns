import {test} from 'node:test'

 test('Top level test', { concurrency: true}, t =>  {
    t.test('Subset 1' , _t => {

    })

    t.test('Subset 2' , _t => {

    })

})

/*
    test options - concurrency: 
        - concurrency : number -> maximum concurrency 설정 
          concurrency : true -> NODE가 현재 시스템에서 가능한 최대의 수만큼 설정 
          concurrency : false (1) -> X

    node의 test runner이 스스로 running tests를 track하고 cancel 안시킴
    -> FUT가 async일 필요없음 

    ENABLE SUBSET CONCURRENCY
    - concurrency test 통해서 빠르게 테스트 가능. 
    - multiple test files에 대해선 node --test-concurrency 통해서 구현가능. 
    - 이때 여러 테스트가 interdependent한 경우라면(최대한 피해야하지만 어쩔수없는 경우) -> node --test-concurrency-1 으로 
      concurrency disable 하고 sequentially하게 프로그램 작동 가능 
*/