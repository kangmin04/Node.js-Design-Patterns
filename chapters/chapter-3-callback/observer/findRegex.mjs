import {EventEmitter} from 'node:events' 
import { readFile } from 'node:fs'

function findRegex(files , regex){
    const emitter = new EventEmitter(); 
    for(const file of files){
        readFile(file , 'utf-8' , (err , data) => {
            if(err) {
                return emitter.emit('error' , err); 
            }
            emitter.emit('fileread' , file); 
            const match = data.match(regex); 
          if(match){
            for(const elem of match){
                console.log('elem: ' , elem)
                emitter.emit('found' , file , elem);
            }
          }
        })
    }
    return emitter ; 
}


findRegex(['fileA.txt' , 'fileB.json'] , /hello [\w.]+/g )
.on('fileread' , (file) => console.log('fileread' , file))
.on('found' , (file , match) => console.log(`Match : ${match} in ${file}`))
.on('error' , err => console.error("error : " , err.message));

process.on('uncaughtException' , () => {
    console.log('errororor')
})