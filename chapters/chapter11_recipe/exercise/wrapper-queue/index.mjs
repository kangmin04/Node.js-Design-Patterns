import { db } from "./db.mjs";
import { wrapperQueue } from "./wrapperQueue.mjs";


const consumer = {
    initMethod: 'connect',          // 이 메서드가 초기화용이다!
    initProperty: 'isReady',        // 상태를 확인할 속성 이름
    watchMethods: ['query', 'exec'] // 대기 큐에 넣을 메서드들
}
const asyncInstance = wrapperQueue(db, consumer)
asyncInstance.query('SELECT * FROM users')
asyncInstance.connect(); 
asyncInstance.query('SELECT * FROM users')
// asyncInstance.query('random sstring'); 
// 추상화를 통해서 asyncINstance의 query가 처음에 제공한 메서드 배열에 존재하는지 체크 후 
//존재하면 비동기 작업 완료되는거 await 후 실제 과정 진행 
//존재 안 할 경우, (비동기 작업 및 준비 과정필요한게 아니니 그냥 바로 리턴)