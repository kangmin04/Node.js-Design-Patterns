// //3-2. write a function that accepts a number and a cb as the argument. 

import {EventEmitter} from 'node:events'

const emitter = new EventEmitter(); 

function ticker(number , cb){
  
    let startTime = Date.now()
    let tickCount = 0 ; 

    const doTick = () => {
        const elapsedTime = Date.now() - startTime; 
        if(elapsedTime > number){
            return cb(null , tickCount); 
        }
        emitter.emit('tick' , Date.now());
        tickCount++;
        setTimeout(doTick , 50); 
    }
    process.nextTick(doTick) 
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
.on('tick' , (time) => {
    console.log('tick is happening')
    checkMod(time)
})
.on('error' , () => {
    console.log('error')
})


const checkMod = (time) =>{
    if(time % 5 === 0 ){
        console.log(`${time} is divisible by 5`)
        return emitter.emit('error')
    } else {
        return emitter; 
    }
}









