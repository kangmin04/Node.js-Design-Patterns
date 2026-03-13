import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { canPayWithVouchers } from './payments.js' // dynamic import 할 필요 없다 !! 
const sampleRecords = [ /* ... elided for brevity */ 
  {
    id: 1,
    userId: 'user1',
    balance: 10,
    expiresAt: new Date(Date.now() + 1000),
  },
  {
    id: 2,
    userId: 'user1',
    balance: 5,
    expiresAt: new Date(Date.now() + 1000),
  },
  {
    id: 3,
    userId: 'user1',
    balance: 3,
    expiresAt: new Date(Date.now() + 1000),
  },
]
suite('canPayWithVouchers', { concurrency: true, timeout: 500 }, () => { // concurrency도 true 가능. global module 전체를 모킹하지않으니, isolated하고 safe하게 parallel 가능
  test('Returns true if balance is enough', async t => {
    const dbMock = { // 3
      query: t.mock.fn(async (_sql, _params) => {
        await setImmediate()
        return sampleRecords
      }),
    }
    const result = await canPayWithVouchers(dbMock, 'user1', 18)
    assert.equal(result, true)
    assert.equal(dbMock.query.mock.callCount(), 1)
  })
  test('Returns false if balance is not enough', async t => {
    /*
      기존엔 mock.module로 mocking 하기위해서, dbMock 자체를 글로벌하게 둠
      그 결과  각 테스트 시 reset을 해줘야했음. 
      DI는 각 테스트 내부에 dbMock구현 -> 테스트 끝나몀ㄴ 영향 안주고 종료됨. 
    */
    const dbMock = { 
      query: t.mock.fn(async (_sql, _params) => {
        await setImmediate()
        return sampleRecords
      }),
    }
    const result = await canPayWithVouchers(dbMock, 'user1', 19)
    assert.equal(result, false)
    assert.equal(dbMock.query.mock.callCount(), 1)
  })
})