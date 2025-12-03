import {EventEmitter} from 'node:events' 
import { readFile } from 'node:fs' 

class FindRegex extends EventEmitter { //event emitter 상속받아 , on / emit 메서드 사용
    constructor(regex){
        super(); 
        // event emitter 제대로 동작하려면 이벤트 리스너 목록 초기화 등의 준비가 필요
        //해당 준비들은 event emitter의 constructor에서 실행됨. 
        //super() 호출하여 eventemitter 초기화 로직 먼저 실행 후 FindRegex 클래스만의 초기화 진행해줌
        this.regex = regex ; 
        this.files = [] ; //여기서 this : FindRegex 인스턴스를 가리킴

    }

    addFile(file){
        this.files.push(file);
        return this ;  // 메서드체이닝으로 instance.addFile().addFile() 이렇게 할것. 
        //여기서 this : 메서드를 호출한 객체 .. 즉 , FindRegex 인스턴스를 가리킴
    }

    find(){
        for(const file of this.files){
            readFile(file , 'utf-8' , function(err , data){
                console.log('function에서 this' , this)
                if(err) {
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
            })
        }

        return this
    }
}

const findRegexInstance = new FindRegex(/hello [\w.]+/g)

findRegexInstance
  .addFile('fileA.txt')
  .addFile('fileB.json') // JSON 파싱 에러는 현재 코드에서 감지하지 않음
  .find()
  .on('fileread', (file) => console.log(`${file} was read`))
  .on('found', (file, match) => console.log(`Matched "${match}" in ${file}`))
  .on('error', (err) => console.error(`Error emitted: ${err.message}`));
