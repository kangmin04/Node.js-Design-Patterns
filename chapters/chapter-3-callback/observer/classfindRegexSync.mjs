import {EventEmitter} from 'node:events' 
import { readFileSync } from 'node:fs' 

class FindRegex extends EventEmitter { //event emitter 상속받아 , on / emit 메서드 사용
    constructor(regex){
        super(); 
        this.regex = regex ; 
        this.files = [] ; 

    }

    addFile(file){
        this.files.push(file);
        return this ;  
    }

    find(){
        for(const file of this.files){
            let data;  
            try{
               data = readFileSync(file , 'utf-8');
            }catch(err) {
                return this.emit('error' , err); 
            }

            this.emit('fileread' , file); 
            const match = data.match(this.regex); 
              if(match){
                for(const elem of match){
                    console.log('elem: ' , elem)
                    this.emit('found' , file , elem);
                }
              }
            }
        }}

    


const findRegexInstance = new FindRegex(/hello [\w.]+/g)

findRegexInstance
  .addFile('fileA.txt')
  .addFile('fileB.json') // JSON 파싱 에러는 현재 코드에서 감지하지 않음
  //.find() 여기서 이벤트 발생 시키면 동기적이기에 , 뒤에 나오는 이벤트 리스너들이 등록이 안된 상태로 실행됨. 
  .on('fileread', (file) => console.log(`${file} was read`))
  .on('found', (file, match) => console.log(`Matched "${match}" in ${file}`))
  .on('error', (err) => console.error(`Error emitted: ${err.message}`))
  .find()