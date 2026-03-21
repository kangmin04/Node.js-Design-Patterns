import {setTimeout} from 'node:timers/promises'; 
import { db } from './db.mjs';
db.connect(); 
async function updateLastAccess() {
    await db.query(`INSERT (${Date.now()}) INTO "lastAccesses"`)
}

updateLastAccess()
await setTimeout(600)
updateLastAccess(); 