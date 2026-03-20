/*
    Uses an in-memory SQLite database
    Adds three different orders using placeOrder()
    Updates the ETA for one of the orders and marks another one as delivered
    Asserts that getOrders() returns all three orders
    The status and eta fields reflect the updates correctly
*/

/*
    1. 수정할 점: select는 순서 보장 X. expected와 달라질수있음 (현상: SQLite는 보통 삽입 순서대로 데이터를 주지만, SQL 표준상 ORDER BY가 없으면 결과의 순서를 보장하지 않습니다.
    수정 제안: getOrders 쿼리에 ORDER BY id ASC를 추가하면, 테스트 코드의 expected 배열 순서와 실제 결과 순서가 꼬여서 테스트가 실패하는 일을 방지할 수 있습니다.)  
    2. markAsDelivered의 하드코딩: 현재 status = "delivered"로 작성되어 있습니다. 만약 나중에 상태값이 추가되거나 변경된다면, 클래스 내부에 상수(static STATUS = { DELIVERED: 'delivered' })를 정의해서 사용하는 것이 유지보수에 유리합니다.
    3. 4. 에러 핸들링 (기능 확장)
    현재 코드는 "해당 ID가 없을 때"에 대한 처리가 없습니다.
    생각해볼 점: markAsDelivered('999')를 호출했을 때, 현재 코드는 에러 없이 조용히 지나갑니다
    4. . 테스트 라이프사이클 관리 (before/after)
    현재는 test 블록 내부에서 DB 생성, 테이블 생성, DB 종료(db.close())를 모두 처리하고 있습니다. 테스트 케이스가 늘어날 경우를 대비해 Node.js Test Runner의 hooks를 활용해 보세요.
    before after each
*/

import test, { suite } from "node:test";
import { DbClient } from "./dbClient.mjs";
import { PizzaTracker, createTables} from "./PizzaTracker.mjs";
import  assert  from "node:assert/strict";


suite('pizza integration test' , {concurrency: true, timeout: 500}, () => {
    test('returns all three orders' , async () => {
        const db = new DbClient(':memory:') //db 생성 
        const pizzaTrack = new PizzaTracker(db);  //tried to add createTable for 멱등성 BUT rather seperate it and use it explicitly for later use 

        await createTables(db); 
        // console.log('created')
        await pizzaTrack.placeOrder('1', 'first user', 'cheesePizza'); 
        await pizzaTrack.placeOrder('2', 'second user', 'hamPizza'); 
        await pizzaTrack.placeOrder('3', 'third user', 'potatoPizza'); 

        const res1 = await pizzaTrack.getOrders()
        assert.equal(res1.length, 3)

        
        await pizzaTrack.updateEta('1', 45) //update ETA
        await pizzaTrack.markAsDelivered('2'); 
    
        const expected = [
            {
              id: '1',
              customerName: 'first user',
              pizzaType: 'cheesePizza',
              status: 'pending',
              eta: 45
            },
            {
              id: '2',
              customerName: 'second user',
              pizzaType: 'hamPizza',
              status: 'delivered',
              eta: null
            },
            {
              id: '3',
              customerName: 'third user',
              pizzaType: 'potatoPizza',
              status: 'pending',
              eta: null
            }
          ]


        const res2 = await pizzaTrack.getOrders()
        assert.deepEqual(res2, expected)
        
        db.close()
    })
})