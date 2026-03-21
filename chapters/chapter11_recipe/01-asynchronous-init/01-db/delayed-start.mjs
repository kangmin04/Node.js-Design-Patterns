async function getConnectedDb(){
    await db.connect(); 
    return db; 
}
async function getUsers(db){
    await db.query(`SELECT * FROM users`)
}
const db = await getConnectedDb(); 
await getUsers(connectedDb)
