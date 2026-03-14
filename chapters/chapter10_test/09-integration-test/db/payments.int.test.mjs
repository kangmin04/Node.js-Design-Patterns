import {suite, test} from 'node:test'
import { DbClient } from './dbClient.mjs'
import {createTables} from './dbSetup.mjs'
import { getActiveVouchers, canPayWithVouchers } from './payments.mjs'
import assert from 'node:assert/strict'

function addTestUser(db, id, name){
    return db.query(
        `INSERT INTO users (id, name) VALUES (?, ?)` , [id, name]
    )    
}

async function addTestVoucher(db, id, userid, balance, expiresAt){
    const record = {
        id,
        userid,
        balance,
        expiresAt: expiresAt ?? new Date(Date.now() + 1000).toISOString() 
        /* ?? = nullish coalescing operator. ,  좌측이 null이면 우측 리턴, null이 아니면 좌측 리턴함 */
    }
    
    await db.query(
        `INSERT INTO vouchers (id, userid, balance, expiresAt) VALUES (?, ?, ?, ?)` , 
        [record.id, record.userid, record.balance, record.expiresAt]
    )

    return record
}

/* AddTestUser 함수: 
    db query는 프로미스를 반환. 
    해당 작업에선 프로미스만 반환하면 되기에 그냥 호출한곳으로 return promise를 해주고 해당 부분에서 await 해줘도 무방. 
    await addTestUser 형식 
    
    반면, addVoucher함수는 단순 프로미스를 반환하는게 아닌 record를 반환함. 
    즉, db query에 await 안해주면 record를 db에 저장안한채 동기적으로 반환. (db err이 난 경우에도 record는 정상적ㅇ로 리턴되므로 문제임. )  
*/

suite('activeVouchers', {concurrency: true, timeout: 500}, () => {
    test('queries for active vouchers', async() => {
       
        const expected = []
        const db = new DbClient(':memory:')
     
        await createTables(db)
       
        await addTestUser(db, 'user1', 'Test User 1') //실제 테스트할 user1
        await addTestUser(db, 'user2', 'Test User 2') // 반례 위한 테스트 용 
       
        expected.push(await addTestVoucher(db, 'voucher1', 'user1', 10))
        expected.push(await addTestVoucher(db, 'voucher2', 'user1', 5))
        expected.push(await addTestVoucher(db, 'voucher3', 'user1', 3))

        //반례들 
        await addTestVoucher(db, 'voucher4', 'user1', 10, new Date(Date.now() - 1000).toISOString())
        await addTestVoucher(db, 'voucher5', 'user2', 10)
        await addTestVoucher(db, 'voucher6', 'user1', 0)

        const activeVouchers = await getActiveVouchers(db, 'user1'); 
        db.close();
        assert.deepEqual(activeVouchers, expected)
    })
})

suite('canPayWithVouchers', { concurrency: true, timeout: 500 }, () => {
    test('Returns true if balance is enough', async () => {
      const db = new DbClient(':memory:')
      await createTables(db)
      await addTestUser(db, 'user1', 'Test User 1')
      await addTestVoucher(db, 'voucher1', 'user1', 10)
      await addTestVoucher(db, 'voucher2', 'user1', 5)
      await addTestVoucher(db, 'voucher3', 'user1', 3)
  
      const result = await canPayWithVouchers(db, 'user1', 18)
  
      db.close()
      assert.equal(result, true)
    })
  
    test('Returns false if balance is not enough', async () => {
      const db = new DbClient(':memory:')
      await createTables(db)
      await addTestUser(db, 'user1', 'Test User 1')
      await addTestVoucher(db, 'voucher1', 'user1', 10)
      await addTestVoucher(db, 'voucher2', 'user1', 5)
      await addTestVoucher(db, 'voucher3', 'user1', 3)
  
      const result = await canPayWithVouchers(db, 'user1', 19)
  
      db.close()
      assert.equal(result, false)
    })
  })