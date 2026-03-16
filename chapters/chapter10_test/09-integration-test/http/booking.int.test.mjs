import {suite, test} from 'node:test'
import assert from 'node:assert/strict'
import { DbClient } from './dbClient.mjs'
import { createTables } from './dbSetup.mjs'
import { createApp } from './app.mjs'

suite('Booking integration tests', {concurrency: true}, () => {
    test.todo('Reserving a seat works until full', async () => {
        const db = new DbClient(':memory:');
        await createTables(db);
        const app = await createApp(db); // app 생성을 먼저 기다립니다.

        // app.inject()가 반환하는 Promise를 바로 await 합니다.
        const response = await app.inject({
            method:'POST',
            url:'/events',
            payload:{
                name: 'Event 1' , totalSeats: 2
            }
        }); 

        assert.equal(response.statusCode, 201);
        const eventData = response.json();
        const reserveUrl = `/events/${eventData.eventId}/reservations`; 

        const res1 = await app.inject({
            method:'POST', 
            url: reserveUrl, 
            payload: {
                userId: 'user1'
            }
        })
        assert.equal(res1.statusCode, 201)

        const res2 = await app.inject({
        method:'POST', 
        url: reserveUrl, 
        payload: {
                userId: 'user2'
            }
        })
        assert.equal(res2.statusCode, 201)

        const res3 = await app.inject({
            method:'POST', 
            url: reserveUrl, 
            payload: {
                    userId: 'user3'
                }
            })
        assert.equal(res3.statusCode, 403)
        await db.close()
        await app.close()
    })

    test.todo('Returns 404 if event does not exist', async () => {
        const db = new DbClient(':memory:');
        await createTables(db);
        const app = await createApp(db); 

        const response = await app.inject({
            method:'POST',
            url:'/events/unknown/reservations',
            payload:{
                userId: 'user1'
            }
        }); 

        assert.equal(response.statusCode, 404);
        /* 
        assert.equal(response.json(), {error: 'Event not found'}) 로 할 경우 
        AssertionError [ERR_ASSERTION]: Values have same structure but are not reference-equal:  */
        assert.deepEqual(await response.json(), {error: 'Event not found'})
        /*
            response.json() : 
            HTTP 응답의 body를 스트림에서 다 읽어온 후, 내용을 JSON 형태로 파싱하는 것 
            결과로 프로미스를 반환하기에 비동기 -> await 사용해줘야 함 
        */

        await db.close()
        await app.close()
    })

    test.todo('Fastify schema validation works', async () => {
        const db = new DbClient(':memory:'); 
        await createTables(db);
        const app = await createApp(db); 

        const response = await app.inject({
            method:'POST',
            url:'/events',
            payload:{
                name : 'kim'
            }

        })

        assert.equal(response.statusCode , 400)
    })
})
