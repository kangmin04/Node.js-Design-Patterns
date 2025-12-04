// 문제 : 
// 프로세스가 시작될 때 start 이벤트를 발생시킨다.
// 입력 파일 목록(list)을 인자로 전달한다.
// 잘고 현상을 피한다 (비동기로 처리).

import {EventEmitter} from 'node:events' 
import { readFile } from 'node:fs' 

class FindRegex extends EventEmitter { 
    constructor(regex){
        super(); 
        
        this.regex = regex ; 
        this.files = [] ; 

    }

    addFile(file){
        this.files.push(file);
        return this ;  
    }

    find(){//find 하자마자 start 돼야함.  원랜 비동기로 하려고 콜백 내에 this.emit을 해줬고 한번만 실행하고자 리스너 등록을 once로 해줬음 
        //BUT 문제 의도 상 시작하자마자 하기위해선 밖에 둬야했고 비동기처리를 위해 프로세스 사용. 
        process.nextTick(() => {
            this.emit('start' , this.files);
        })
        for(const file of this.files){
            readFile(file , 'utf-8' , (err , data) => {
                if(err) {
                    return this.emit('error' , err); 
                }
                // this.emit('start' , file)
               this.emit('fileread' , file); 
            const match = data.match(this.regex); 
              if(match){
                for(const elem of match){
                    console.log('elem: ' , elem)
                    this.emit('found' , file , elem);
                }
              }
            })
        }

        return this
    }
}

const findRegexInstance = new FindRegex(/hello [\w.]+/g)

findRegexInstance
  .addFile('fileA.txt')
  .addFile('fileB.json') 
  .find()
  .on('fileread', (file) => console.log(`${file} was read`))
  .on('found', (file, match) => console.log(`Matched "${match}" in ${file}`))
  .on('error', (err) => console.error(`Error emitted: ${err.message}`))
  .once('start' , (file) => {console.log('file 목록 : ' , file)}) //한번만 실행