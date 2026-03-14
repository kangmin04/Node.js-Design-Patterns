export async function createTables(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL
        )
        `)
    await db.query(`
        CREATE TABLE IF NOT EXISTS vouchers (
            id TEXT PRIMARY KEY,
            userid TEXT NOT NULL,
            balance REAL NOT NULL, 
            expiresAt TIMESTAMP
        )
        `)    
}

/*
    IF NOT EXISTS 로, 실제 존재할땐 안만듦. 
    -> 함수가 여러번 호출되지않도록 처리함. 
    IDEMPOTENT (멱등성)

    추가에러사항. 
    CREATE TABLE 시 column 나열할 때 마지막 건 콤마 없어 해야함! 안그러면 syntax err
*/
