import {EventEmitter} from 'node:events'
import {get} from 'node:https'

function download(url , cb){
    const eventEmitter = new EventEmitter(); 
    const req = get(url , (res) => {
        
    })
}