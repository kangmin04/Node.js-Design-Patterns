import {EventEmitter} from 'node:events' ; 

const emitter = new EventEmitter() ;

emitter.on('events' , (arg) => {
    console.log('event happened. And there was ' , arg) 
})

emitter.emit('events' , '매개변수')