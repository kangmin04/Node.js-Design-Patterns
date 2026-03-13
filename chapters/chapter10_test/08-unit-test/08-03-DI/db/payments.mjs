/* canPay function에 인자로 db를 넣어서 dependency Injection 
  tight coupled된걸 해소가능. 
  dependency를 외부에서 가져와서 dependency가 수정된해도 테스트 로직은 변경 할 필요 없다. 
*/
export async function canPayWithVouchers(db, userId, amount) {
    const vouchers = await db.query(
      `SELECT * FROM vouchers
         WHERE user_id = ? AND
         balance > 0 AND
         expiresAt > NOW()`,
      [userId]
    )
    const availableBalance = vouchers.reduce((acc, v) => acc + v.balance, 0)
    return availableBalance >= amount
  }