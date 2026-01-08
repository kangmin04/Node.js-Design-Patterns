// import {create} from 'node:stream'
import {createReadStream} from 'node:fs'
import { PassThrough } from 'node:stream'

const monitor = new PassThrough(); 
let bytes = 0;  //변수 0으로 초기화 안하면 undefined를 가짐. 

monitor.on('data' , chunk=> {
    bytes += chunk.length
})
createReadStream('file.txt')
    .pipe(monitor)
    .on('finish' , () => {
        console.log('byte: ' , bytes)
    })