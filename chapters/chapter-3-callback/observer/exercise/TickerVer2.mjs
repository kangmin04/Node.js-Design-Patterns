// //3-2. write a function that accepts a number and a cb as the argument. 

import {EventEmitter} from 'node:events'

function ticker(number , cb){
    const emitter = new EventEmitter(); 
    let startTime = Date.now()
    let tickCount = 0 ; 

    const doTick = () => {
        const elapsedTime = Date.now() - startTime; 
        if(elapsedTime > number){
            return cb(null , tickCount); 
        }
        emitter.emit('tick');
        tickCount++;
        setTimeout(doTick , 50); 
    }
    //doTick()  - 기존 ! 그냥 doTick하니 , 첫번째 이벤트는 on으로 리스너 등록도 되기전에 실행되서 하나 누락됨.... 
    //3-2. 
    // setTimeout(() => doTick() , 50) - ver2. 50 기다리고 태스크큐에 넣어 진행
    process.nextTick(doTick) //ver3.  3-3. emit tick immediately after function invoked.. 
    return emitter ; 
}


console.log('start')
ticker(400 , (err , data) => {
    if(err){
        console.log('error : ' , err)
        return ; 
    }
    console.log('total count of tick : ' , data)

})
.on('tick' , () => {console.log('[FROM emiter] : tick')} )










