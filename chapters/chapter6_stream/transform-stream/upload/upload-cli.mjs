import {createReadStream} from 'node:fs'
import { createBrotliCompress } from 'node:zlib'
import { PassThrough } from 'node:stream'
import { basename } from 'node:path'
import { upload } from './upload.mjs'

const filepath = process.argv[2]
const filename = basename(filepath); 
const contentStream = new PassThrough(); //#1 

upload(`${filename}.br` , contentStream)
    .then(res => console.log('server res : ' , res.data))
    .catch(err => {
        console.error(err)
        process.exit(1)
    })

createReadStream(filepath) //#2
    .pipe(createBrotliCompress())
    .pipe(contentStream)


//개념 : 
//우선 upload등의 비동기 함수는 대부분 readable stream을 받도록 설계됨. (writable X)
//But 우리가 전달할 압축 스트림은 createReadstream().pipe(compress)해야만 만들어지기 시작함. 
//해당 데이터를 pipe 하려면 최종 목적지인 writable이 필요. 
//처음에 난 여기에 바로 uplaod로직을 pipe 하면 되지않을까 생각했으나, upload는 readable을 받음. 
//즉, writable인걸 받아서 readable로 해주는 매개체가 필요 => passThrough

// #1. 
//빈 contentStream만들고  -> upload 호출. 
//이때 contentStream은 readble이기에 문제없음
//contentStream에 데이터가 들어오면 해당 upload가 실행된다. 

// #2. 
//그 이후 실제 데이터 파이프 구성. 
//contentStream은 여기선 writable로 기능하며 최종 목적지가됨. 
//압축된 데이터가 쓰여지는 즉시 , upload 함수는 contentStream을 readable로 읽기시작하여 서버로 전송