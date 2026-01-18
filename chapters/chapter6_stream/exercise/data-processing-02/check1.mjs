import {Transform} from 'node:stream'

let yearCount = {}
let max = 0 ; 
let maxYear = ''; 

export const check1 = new Transform({objectMode : true , 
    transform(chunk , _enc , cb){
        if(!(chunk.year in yearCount)){
            yearCount[chunk.year] = 1; 
        }else{
            yearCount[chunk.year]+=1; 
            findMaxYear(max , yearCount[chunk.year] , chunk.year)
            
        }
        cb(); 
    } , 
    flush(cb){
        cb()
    }
} )

check1.on('finish' , () => {
    console.log( 'question1 : ',maxYear , yearCount[maxYear] , yearCount )
    maxYear = 0 ; max = 0 ; yearCount = {}; 
})
function findMaxYear(max , currentYearNum , currentYear){
    if(max < currentYearNum){
        max = currentYearNum ; 
        maxYear = currentYear
    }
}