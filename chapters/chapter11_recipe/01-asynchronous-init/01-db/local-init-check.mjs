import { db } from "./db.mjs";

async function getUsers(){
    if(!db.connected){
        await db.connect(); 
    }
    await db.query(`SELECT * FROM users`)
}

await getUsers(); 


//WRONG INIT

/* 1. 
    db.connect()
    const users = await db.query('SELECT * FROM users')
    console.log(users)
*/