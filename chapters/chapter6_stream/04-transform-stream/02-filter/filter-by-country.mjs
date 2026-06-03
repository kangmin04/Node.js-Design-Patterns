import {Transform} from 'node:stream'

export class FilterByCountry extends Transform {
    constructor(country , options = {}){
        super({...options , objectMode : true})
        this.country = country
    }

    _transform(record , _encoding , cb){
        if(record.country === this.country){
            this.push(record) //conditional 하게 다음 스트림으로 넘기기. 
        }
        cb() //현재 스트림 성공적으로 진행됨을 알리기 + 다른 데이터를 받을 준비가 됨을 알리기
        
    
    }
}