import { createApp } from "./app.mjs";
import { DbClient } from "./dbClient.mjs";
import {createTables} from './dbSetup.mjs'; 
import { createEvent, reserveSeat } from "./booking.mjs";

const db = new DbClient('data/db.sqlite')
await createTables(db); 
const returnId = await createEvent(db, 'event1', 5);
console.log('첫 이벤트의 id', returnId)
await reserveSeat(db, returnId, 'user1')

// const app = await createApp(db)
// app.listen({port: 3000})
