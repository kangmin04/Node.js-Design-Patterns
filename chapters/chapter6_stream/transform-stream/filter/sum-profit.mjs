import {Transform} from "node:stream"

export class sumProfit extends Transform {
    constructor(options = {}){
        super({...options , objectMode : true})
        this.total = 0 ; 
    }

    _transform(record , _encoding , cb){
        this.total += Number.parseFloat(record.profit)
        cb(); 
    }

    _flush(cb){
        this.push(this.total.toString()); //chunk 는 string이거나, buffer Instance , Object여야함. toString없이 number로 넘어가면 에러 
        cb()
    }

    
}