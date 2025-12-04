//3-2. write a function that accepts a number and a cb as the argument. 

import {EventEmitter} from 'node:events'

function ticker(number , cb){
    const emitter = new EventEmitter(); 
    //내가 4000 을 주면 함수 실행 후 4초까지는 계속 50밀리초간 tick 이벤트를 해야하고 4초 이후엔 tick이 종료되야함
    while(number)
    setInterval( () => {emitter.emit('tick')} , 50) ; 
    
    return emitter ; 
}
