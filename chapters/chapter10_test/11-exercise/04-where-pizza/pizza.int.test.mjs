/*
    Uses an in-memory SQLite database
    Adds three different orders using placeOrder()
    Updates the ETA for one of the orders and marks another one as delivered
    Asserts that getOrders() returns all three orders
    The status and eta fields reflect the updates correctly
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


        await pizzaTrack.updaateEta('1', 45) //update ETA
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