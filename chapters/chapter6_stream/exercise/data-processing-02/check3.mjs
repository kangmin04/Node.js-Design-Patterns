import {Transform} from 'node:stream'
//group By 'borough' 
//
let borough = {
 
}
/*
    2demension array

                bunglary  drug  assault 
    camden
    islington
    hackney
*/
export const check3 = new Transform({objectMode : true , 
    transform(chunk , _enc , cb){
        if(!(Object.keys(chunk.borough) in borough)){
            if(!(borough[Object.keys(chunk.borough)][chunk.crime_type] in borough[Object.keys(chunk.borough)])){
                borough[Object.keys(chunk.borough)][chunk.crime_type] = 1; 
            }else{
                borough[Object.keys(chunk.borough)][chunk.crime_type]+= 1; 
            }
            
        }else{
            if(!(borough[Object.keys(chunk.borough)][chunk.crime_type] in borough[Object.keys(chunk.borough)])){
                borough[Object.keys(chunk.borough)][chunk.crime_type] = 1; 
            }else{
                borough[Object.keys(chunk.borough)][chunk.crime_type]+= 1; 
            }
            // borough[Object.keys(chunk.borough)][chunk.crime_type] += 1; 
            
        }
        cb(); 
    } , 
    flush(cb){
        cb()
    }
} )

check3.on('finish' , () => {
    console.log(borough)
})
