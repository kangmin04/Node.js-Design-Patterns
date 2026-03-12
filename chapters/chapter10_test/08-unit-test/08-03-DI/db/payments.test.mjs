import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { canPayWithVouchers } from './payments.js' // 1
const sampleRecords = [ /* ... elided for brevity */ ]
suite('canPayWithVouchers', { concurrency: true, timeout: 500 }, () => { // 2
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
    const dbMock = { // 3
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