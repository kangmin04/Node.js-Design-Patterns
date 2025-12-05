// //3-2. write a function that accepts a number and a cb as the argument. 

import {EventEmitter} from 'node:events'

function ticker(number , cb){
    const emitter = new EventEmitter(); 
    //내가 4000 을 주면 함수 실행 후 4초까지는 계속 50밀리초간 tick 이벤트를 해야하고 4초 이후엔 tick이 종료되야함
    let time = 0 ;
    let timerId = setTimeout( function tick(){
        time+=50 ; 
        if(number < time){
            console.log('timer 종료 '); 
            clearTimeout(timerId);
            return cb(null , number/50) ; 
            // return emitter.emit('done')
        }
       
        emitter.emit('tick' , time) 
        timerId = setTimeout(tick , 50);
    }, 50)
    
    return emitter ; 
}



ticker(100 , (err , data) => {
    console.log('total count of tick : ' , data)
})
.on('done' , () => {console.log('FROM emitter] : timer DONE')})
.on('tick' , () => {console.log('[FROM emiter] : tick')} )


















//------------------------------------------------------------------------------------------

//중첩 setTimeout
// let timerId = setTimeout(function tick(){
//     console.log('Alert 1 ') ; 

//서버가 과부하 상태인경우 요청 간격을 늘려야할텐데 , 그럴때 유동적으로 delay 값 변경가능.  ---> setInterval에선 불가 
//     timerId = setTimeout(tick , 2000) ; 
// } , 2000)



// function tick(){
//     console.log('Alert 1 ') ; 
//     let timerId = setTimeout(tick , 2000) ;}

// tick(); // 가장 첫 출력에 대해선 delay 안됨/ 
