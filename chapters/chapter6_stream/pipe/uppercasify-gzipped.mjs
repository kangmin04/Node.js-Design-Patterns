// Reads a Gzip data stream from the standard input
// Decompresses the data
// Makes all the text uppercase
// Gzips the resulting data
// Sends the data back to the standard output
//BUT USING PIPELINE(stream1 , stream2)

import {createReadStream , createWriteStream} from 'node:fs'
import {createGzip} from 'node:zlib'
import { createGunzip } from 'node:zlib';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises'; //promise ver of the pipleline

const filename = process.argv[2]; 

class toUpperCase extends Transform{
    constructor(options){
        super(options); //NO NEED TO USE OBJECT MODE
        //IM USING BUFFER AND STRING
    }

    _transform(chunk, _encoding, cb){
        console.log('typeof chunk : ' , typeof(chunk))
        console.log('chunk : ' ,chunk)
        console.log('chunk string: ' ,chunk.toString())
        this.push(chunk.toString().toUpperCase())
        cb()
    }

    _flush(cb){
      
        cb(); 
    }
}

createReadStream(filename)
    .pipe(createGunzip())
    .pipe(new toUpperCase())
    .pipe(createGzip())
    .pipe(process.stdout)
    .on('finish' , () => {console.log('done')})

// pipeline(
//     createReadStream(filename) ,createGunzip() , new toUpperCase() )