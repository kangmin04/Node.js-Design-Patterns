async function reserveSeatWithTransaction(db, eventId, userId) {
    try {
      // 1. 트랜잭션 시작
      await db.query('BEGIN TRANSACTION');
  
      // 2. [트랜잭션 내부] 이벤트 존재 여부 및 최대 좌석 수 확인
      const event = await db.get('SELECT id, max_seats FROM events WHERE id = ?', [eventId]);
      if (!event) {
        // 이벤트가 없으면 에러를 발생시켜 catch 블록으로 이동 -> ROLLBACK
        throw new Error('Event not found');
      }
  
      // 3. [트랜잭션 내부] 현재 예약된 좌석 수 확인
      const existingReservation = await db.get('SELECT count(*) as count FROM reservations WHERE event_id = ?', [eventId]);
      const reservedCount = existingReservation.count;
  
      // 4. [트랜잭션 내부] 좌석 여유분 확인
      if (reservedCount >= event.max_seats) {
        // 좌석이 없으면 에러 발생 -> ROLLBACK
        throw new Error('No seats available');
      }
  
      // 5. [트랜잭션 내부] 좌석 예약 실행
      await db.query('INSERT INTO reservations (event_id, user_id) VALUES (?, ?)', [eventId, userId]);
  
      // 6. 모든 작업이 성공했으므로 트랜잭션 커밋
      await db.query('COMMIT');
  
      console.log('Seat reserved successfully!');
      return { success: true };
  
    } catch (error) {
      // 7. 어떤 단계에서든 에러가 발생하면 트랜잭션 롤백
      console.error('An error occurred, rolling back transaction:', error.message);
      await db.query('ROLLBACK');
  
      // 에러를 다시 던져서 호출한 쪽에서 처리할 수 있도록 함
      throw error;
    }
  }
  