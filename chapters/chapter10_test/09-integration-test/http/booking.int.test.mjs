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
        }); // 이제 'response'는 실제 응답 객체입니다.

        // 더 이상 await을 중복해서 사용할 필요가 없습니다.
        assert.equal(response.statusCode, 201);
        const eventData = response.json();
        console.log(eventData);
    })

    test.todo('Returns 404 if event does not exist', async () => {

    })
})
