import { createProfiler } from "./profiler.mjs";

function getAllfactors(n){
    let intNumber = n
    const profiler = createProfiler(`Finding all factors of ${intNumber}`)
    profiler.start(); 
    const factors = []
    for(let factor = 2 ; factor <= intNumber ; factor++){
        while(intNumber % factor === 0 ){
            factors.push(factor); 
            intNumber /= factor
        }
    }

    profiler.end(); 
    return factors
}
const myNumber = process.argv[2]
const myFactors = getAllfactors(myNumber)
console.log(`Factors of ${myNumber} are: `, myFactors)