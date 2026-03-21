import { db } from "./db.mjs";

async function getUsers(){
    if(!db.connected){
        await db.connect(); 
    }
    await db.query(`SELECT * FROM users`)
}