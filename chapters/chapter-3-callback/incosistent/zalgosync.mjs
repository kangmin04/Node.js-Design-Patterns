import {readFileSync} from 'node:fs'
const cache = new Map();
function cosistentRead(filename ){
    if(cache.has(filename)){
        return cache.get(filename); //direct style. returns data directly instead of callback
    }else{
        const data = readFileSync(filename , 'utf-8');
        cache.set(filename , data);
        return data; 
    }
}

const reader1 = cosistentRead('data.txt');  
console.log(reader1)


const reader2 = cosistentRead('data.txt');  
console.log(reader2)

// ** PATERN : purely synchronous style -> use direct style ** 
//sol 1. using sunchronous API instead of asynchrous one. 