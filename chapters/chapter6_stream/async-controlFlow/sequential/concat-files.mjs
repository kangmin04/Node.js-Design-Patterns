import {createReadStream , createWriteStream} from 'node:fs'
import { Readable, Writable , Transform} from 'node:stream'

export function concatFiles(dest , files){
    return new Promise((resolve , reject) => {
        const destStream = createWriteStream(dest); 
        Readable.from(files)
            // .on('data' , (filename) => console.log(filename , typeof(filename))) //filename은 readablestream이 아닌 그냥 file이름임
            .pipe(
                new Transform({
                    objectMode : true , 
                    transform(filename , _enc , done){
                        createReadStream(filename , {end : false}) //readable stream 종료 시 .end() 자동으로 호출됨 -> destStrean 이 close됨
                            .pipe(destStream)
                            .on('error' , done)
                            .on('finish' , done)
                    }
                })
            ).on('error' , (err) => {
                destStream.end() //end와 close 차이. close -> immediately terminate stream.  doesnt guarantee all bufferd data to be written
                //RECOMMEND TO USE END. -> emit finish event only after all data has been flushed
                reject(err); 
            }).on('finish' , () => {
                destStream.end()
                resolve()
            }) 

    })
}