import {test} from 'node:test'

 test('Top level test', async t =>  {
    await t.test('Subset 1' , t => {

    })

    await t.test('Subset 2' , t => {

    })

})

/*
    large test files에 대해서 related test cases grouping이 가능함! 
    -> improving readability and organization

    NODE version 24 미만이면 -> async await 해줘야함
*/