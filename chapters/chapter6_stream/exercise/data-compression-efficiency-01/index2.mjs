
import { createReadStream , createWriteStream} from 'node:fs';
import * as zlib from 'node:zlib'
import { pipeline } from 'node:stream/promises';

const compress = {
    createBrotliCompress : 'br' , 
    createGzip : 'gz' , 
    createDeflate : 'deflate'
}

const filename = process.argv[2]; 
const inputStream = createReadStream(filename) ; 
let startTime ; 
let endTime ; 
for(const [module_ , extension] of Object.entries(compress)){
    startTime = Date.now(); 
    pipeline(
        inputStream , 
        zlib[module_]() , 
        createWriteStream(`${filename}.${extension}`)
    ).then(() => {
        endTime = Date.now(); 
        console.log(`${module_} : ${endTime-startTime}ms`)
    }).catch(err => console.log(err))
}

