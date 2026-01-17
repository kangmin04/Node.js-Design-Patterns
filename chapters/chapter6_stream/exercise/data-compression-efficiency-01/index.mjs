/*
    6.1 Data compression efficiency: 
    Write a command-line script that takes a file as input and compresses it 
    using the different algorithms available in the zlib module (Brotli, Deflate, Gzip). 
    You want to produce a summary table that compares the algorithm’s compression time and compression efficiency on the given file. 
    Hint: This could be a good use case for the fork pattern, 
    but remember that we made some important performance considerations when we discussed it earlier in this chapter.
*/

//반성할 부분 : 
//1. 사실 createReadStream을 하나만 만드는게 forkingStream의 핵심이었다. 생각좀 하자 
//2. 코드 퀄리티가 너무 별로임. 저정도 반복이 나오면 for을 생각해냈어야함....  + 확장자도 객체 형태로 유지보수 가능하도록 
//사실 forking이라 for은 쓰면안됐음... 오히려 좋은 접근인가.... 

import { createReadStream , createWriteStream} from 'node:fs';
import {createBrotliCompress , createGzip , createDeflate} from 'node:zlib'
import { pipeline } from 'node:stream/promises';

const brotli = 'brotli' ;  //.br
const gzip = 'gzip' //.gz
const deflate = 'deflate' //.

const filename = process.argv[2]; 
const inputStream = createReadStream(filename) ; 
const brotlidest = createWriteStream(`brotli${filename}.br`); 


console.time(brotli); 
pipeline(
    inputStream
, createBrotliCompress() , 
brotlidest)
    .then(() => console.timeEnd(brotli) )
    .catch(err => {
        console.error(err)
        brotlidest.end()    
    })


console.time(gzip); 
pipeline(
    inputStream
, createGzip() , 
createWriteStream(`gzip${filename}.br`))
    .then(() => console.timeEnd(gzip) )
    .catch(err => console.error(err))

    
console.time(deflate); 
pipeline(
    inputStream
, createDeflate() , 
createWriteStream(`deflate${filename}.deflate`))
    .then(() => console.timeEnd(deflate) )
    .catch(err => console.error(err))

