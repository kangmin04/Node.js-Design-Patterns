import { request } from "node:http";
import { createGzip } from "node:zlib";
import { createReadStream } from 'node:fs'
import { basename } from 'node:path'
const filename = process.argv[2]
const serverHost = process.argv[3]

const httpRequestOptions = {
    hostname : serverHost , 
    port : 3000 , 
    path : '/' , 
    method : 'POST' , 
    headers : {
        'content-type' : 'application/octet-stream' , 
        'content-encoding' : 'gzip' , 
        'x-filename' : basename(filename)
    }
}

const req = request(httpRequestOptions , res => {
    console.log('Response received' , res.statusCode)
    
})

createReadStream(filename)
    .pipe(createGzip())
    .pipe(req)
    .on('finish' , () => {
        console.log('file successfully sent')
    })