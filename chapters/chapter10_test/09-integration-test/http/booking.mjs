/* multiple user로부터 race conditions이 안전해지려면, transaction / row level locking등의 ensure 절차가 필요하다 */
import {randomUUID} from 'crypto'

export async function reserveSeat(db, eventId, userId) {
  const [event] = await db.query(`SELECT * FROM events WHERE id = ?`, [eventId]) /* select로 가져온 값이 배열이다. 그래서 내부 객체만을 가져오기 위해, [event] 형식으로 받는다 */

  if(!event){
    throw new Error('Event doesnt exist')
  }
  const existing = await db.query(`SELECT COUNT(*) AS count FROM reservations WHERE eventId = ?` , [eventId]); 
  if(existing[0].count >= event.totalSeats){
    throw new Error('Event is fully booked')
  }

  const reservationId = randomUUID(); 
  await db.query(`INSERT INTO reservations (id, eventId, userId) VALUES (?, ?, ?)` , [reservationId, eventId, userId])
  return reservationId
}

export async function createEvent(db, name, totalSeats) {
    const eventId = randomUUID(); 
    await db.query(`
        INSERT INTO events (id, name, totalSeats) VALUES (?, ?, ?)
        `, [eventId, name, totalSeats]
    )

    return eventId
}