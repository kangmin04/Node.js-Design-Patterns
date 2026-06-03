//RESUABLE한 TRANSFORM STREAM 만들필요 없을 떄. 간단한 CASE

import {createReadStream} from 'node:fs'
import { compose , Readable , Writable} from 'node:stream'
import { createGunzip } from 'node:zlib'
import { createInterface } from 'node:readline'

/*
    parsing a CSV file that contains sales data. 
    We want to calculate the total amount of profit made from sales in Italy. 
    Every line of the CSV file has 3 fields: type, country, and profit. 
*/

//'data.csv.gz'
const readGunzip = compose(
    createReadStream('data.csv.gz')
    ,createGunzip()
)
const line = Readable.from(
    createInterface({
        input : readGunzip
    })
)

class Write extends Writable{
    constructor(options){
        super({...options , objectMode : true}) //생각을 좀 해. 당연히 객체로 넘겨야하니까 { } 필요함 
    }

    _write(chunk , _enc , cb){
     console.log(chunk);  //여기서 chunk는 단순 object. 
     cb()
    }
}

const totalAmount = 
await line    //reduce는 stream.readable의 async Iterator임.  reduce는 프로미스 반환! 
    .drop(1)
    .map(chunk => {
        const [type , country , profit] = chunk.toString().split(',');
        return {type , country , profit : Number(profit) }
    })
    
    .filter(chunk => {
        return chunk.country === 'italy'
    })
    .reduce((acc , chunk) => acc+chunk.profit , 0)
    // .pipe(new Write)
    // 굳이 object 출력이라고 objectmode: true 설정 후 클래스로 처리할 필요 없음
    //그냥 map 다음라인에 forEach(obj => console.log(obj))로 충분

console.log(totalAmount)
    