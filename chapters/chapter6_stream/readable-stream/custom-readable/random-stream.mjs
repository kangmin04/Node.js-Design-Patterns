import {Readable} from 'node:stream'
import Chance from 'chance' 
const chance = new Chance(); 

export class RandomStream extends Readable {
    constructor(options){
        super(options); 
        this.emittedBytes = 0 ; 
    }

    _read(size){
        const chunk = chance.string({length:size})
        this.push(chunk, 'utf8') // 2
        this.emittedBytes += chunk.length

        if (chance.bool({ likelihood: 70 })) { // 3
            this.push(null)
        }
    }
}

//다른 transform , writable 은 클래스로 정의 시 transform(chunk,_enc , cb) 형태로 cb을 받음
//해당 콜백이 현재 chunk의 완료 및 다음 데이터를 불러옴 . 
//Readable 스트림은 콜백 X. 
//_read 메서드 내에서 데이터 읽어와서 this.push()로 보냄. 
//this.push(null)로  EOF 알림
