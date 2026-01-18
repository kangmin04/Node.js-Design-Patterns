/*
    6.2 Stream data processing: London Crime Data (nodejsdp.link/london-crime). 
    You can download the data in CSV format and build a stream processing script that analyzes the data and tries to answer the following questions:
    1. Did the number of crimes go up or down over the years?
    2. What are the most dangerous areas of London?
    3. What is the most common crime per area?
    4. What is the least common crime?
    Hint: You can use a combination of Transform streams and PassThrough streams to parse and observe the data as it is flowing. 
    Then, you can build in-memory aggregations for the data, which can help you answer the preceding questions. 
    Also, you don’t need to do everything in one pipeline; 
    you could build very specialized pipelines (for example, one per question) and use the fork pattern to distribute the parsed data across them.
*/

import {PassThrough, Readable, Transform , compose} from 'node:stream'
import {createInterface} from 'node:readline'
import { createReadStream } from 'node:fs'
import { check1 } from './check1.mjs'
import { check3 } from './check3.mjs'

const inputStream = createReadStream('./london_crime_data.csv')

const lineStream = Readable.from(
    createInterface({
        input : inputStream
    })
)
//most dangerous area
const check2 = new PassThrough({objectMode : true})
let countBoroughCrime = {};
let max2 = 0 ; 
let maxBorough2 = ''; 

check2.on('data' , (chunk) => { 
    // console.log(chunk)
    if(!(chunk.borough in countBoroughCrime)){
        countBoroughCrime[chunk.borough] = 1
    }else{
        countBoroughCrime[chunk.borough]+=1;
        if(max2 < countBoroughCrime[chunk.borough]){
            max2 = countBoroughCrime[chunk.borough]
            maxBorough2 = chunk.borough; 
        }
    }}
)
check2.on('finish' , () => {
    console.log('question2 : ' , maxBorough2 , max2 , countBoroughCrime)
    // max2 = 0 ; maxBorough2 = 0 ; countBoroughCrime = {};
})

let firstLine = true; //csv Header skip
const makeCsvParser = new Transform({objectMode : true , 
    transform(chunk , _enc , cb){
        if(firstLine){
            firstLine = false; 
            return cb();  
            //콜백을 호출해서 건너뛴다. 
            //이때 return 필수. 
        }
        // let newChunk = chunk.toString() + '\n'; 
        let [id , borough , crime_type , year , month] = chunk.split(',') 
        this.push( {id : id , borough : borough , crime_type : crime_type , year: year , month : month.trim()})
        cb(); 
    }
} )

// const finalStream = compose(lineStream , makeCsvParser); 
// finalStream.pipe(check1)
// finalStream.pipe(check2)

/*
    compose : create single duplex stream. 
    above one was still piping same readable source twice. 
 */
const csvParser = makeCsvParser
lineStream.pipe(csvParser); 
csvParser.pipe(check1)
csvParser.pipe(check2)
csvParser.pipe(check3)

// lineStream
//     // .map((line) => `${line}\n` )
//     // .map((line) => {
//     //     let [id , borough , crime_type , year , month] = line.split(',') 
//     //     return {id : id , borough : borough , crime_type : crime_type , year: year , month : month.trim()}
//     // })
//     // .filter((obj) => obj.id !== 'crime_id')
//     .pipe(makeCsvParser)
//     .pipe(check1)



// // lineStream.pipe(makeCsvParser).pipe(check2)

// //crime_id,borough,crime_type,year,month 잠깐 csv 파일 헤더 제거함. 