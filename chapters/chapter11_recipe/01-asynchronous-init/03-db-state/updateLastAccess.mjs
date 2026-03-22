import {setTimeout} from 'node:timers/promises'; 
import { db } from './state.mjs';
db.connect()
async function updateLastAccess() {
    await db.query(`INSERT (${Date.now()}) INTO "lastAccesses"`)
}

updateLastAccess()
await setTimeout(600)
updateLastAccess(); 



/*
    0ms 시점
    db.connect() 실행.
    await setTimeout(500) 실행됨. -> connect란 async 함수 내에서 await 만났기에, connect 함수 멈춤. 
    db.connect앞에 await 없기 때문에 다음 줄로 넘어감. (setTimeout 종료되면, 프로미스 settle 되고, 그럼 async 나머지 부분은 마이크로 태스크 큐로.. )
    updateLastAccess() 실행. -> 내부적으로 await db.query() 실행됨. 
    이때 await 없는 그냥 updateLastAccess 기에 언제끝나는진 관심없음. 비동기 함수기에, 즉시 제어권을 다시 메인스크립트(콜스택)으로 돌려준다. (updateLastAccess() 함수 내부에서 await db.query() 때문에 멈춰있는 것은 updateLastAccess 함수의 사정일 뿐, 그를 호출한 메인 스크립트의 실행 흐름에는 영향을 주지 않습니다.)
    다음줄인 await SetTimeout()에서 메인 스크립트는 정말 600ms 멈춘다. (제어권을 이벤트루프로,, 콜스택은 아예 비워짐. 이후부터 백그라운드에서 실행할 타이머들이 끝나길 기다림.)
    


    500ms 시점 
    db.connect()의 setTimeout(500)이 종료됨
    타이머 콜백이 태스크 큐에 등록된다. 
    


*/