import assert from 'node:assert/strict'
import { after, beforeEach, mock, suite, test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
const sampleRecords = [ // 1
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

/* queryMock 실행 시 sample data 반환하도록 */
const queryMock = mock.fn(async (_sql, _params) => {
    await setImmediate()
    return sampleRecords; 
})

/* canPayWithBoucher함수는 dbClient를 import해서 db.query로 사용함
  테스트이기에, 실제 dbClient 대신 우리가 제공할 가짜 클래스를 리턴시키고자함. 
  가짜 클래스의 query메서드에 queryMock을 만들어, voucher function 이 db의 query메서드를 사용할 때 mock 함수를 리턴시킴 
  즉, 실제 db가 아닌 sample record를 받게됨
*/
mock.module('./dbClient.mjs' , {
    cache: false, 
    namedExports: {
        Dbclient: class DbMock {
            query = queryMock
        }
    }
})

const { canPayWithVouchers } = await import('./payments.mjs') // 4
suite('canPayWithVouchers', { concurrency: false, timeout: 500 }, () => {
  beforeEach(() => { // 각테스트 영향 서로 안주기위해, 매 테스트 시작 전 queryMOck함수의 호출 기록 초기화
    queryMock.mock.resetCalls()
  })
  /* suite가 종료되면 after 실행됨. 
  This is a good practice that keeps the execution environment clean after the test suite is completed,
   in case there are more test files to be executed in the same process.
   */
  after(() => { 
    queryMock.mock.restore()
  })
  test('Returns true if balance is enough', async () => { // 6
    const result = await canPayWithVouchers('user1', 18)
    assert.equal(result, true)
    assert.equal(queryMock.mock.callCount(), 1)
  })
  test('Returns false if balance is not enough', async () => {
    const result = await canPayWithVouchers('user1', 19)
    assert.equal(result, false)
    assert.equal(queryMock.mock.callCount(), 1)
  })
})