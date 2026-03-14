/*
    sql query와 voucher balance 로직을 분리함. 
    --> "SQL 테스트를  isolation하게 하기위함!!"
*/

export async function getActiveVouchers(db, userId){
    const vouchers = await db.query(
        `SELECT * FROM vouchers
           WHERE userid = ? AND
           balance > 0 AND
           expiresAt > strftime('%FT%T:%fz', 'now')`, 
        [userId]
      )
      return vouchers
}

export async function canPayWithVouchers(db, userId, amount) { 
    const vouchers = await getActiveVouchers(db, userId)
    const availableBalance = vouchers.reduce((acc, v) => acc + v.balance, 0)
    return availableBalance >= amount
  }