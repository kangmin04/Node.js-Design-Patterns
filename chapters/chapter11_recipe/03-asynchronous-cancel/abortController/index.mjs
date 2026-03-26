/*
    simple, wrapper 방식 전부 내부의 cancellation object를 manual하게 config. 
    BUT third party의 경우 각각 다른 mechanism으로 구성되고, 해당 cancellation obj를 접근 불가할수도
    --> standard library. AbortController
*/

import { asyncRoutine } from "./asyncRoutine.mjs";

async function cancelable(abortSignal){
    abortSignal.throwIfAborted(); 
    const resA = await asyncRoutine('A'); 
    console.log(resA); 

    abortSignal.throwIfAborted(); 
    const resB = await asyncRoutine('B'); 
    console.log(resB); 
    
    abortSignal.throwIfAborted(); 
    const resC = await asyncRoutine('C')
    console.log(resC); 
}

const ac = new AbortController()

setTimeout(() => {
    ac.abort(); //trigger cancellation.  인자로 Error 객체주면 해당 에러로 나옴. Default는 'AbortError' 
}, 100); 

try {
    await cancelable(ac.signal); // 
} catch (err) {
    if(err.name === 'AbortError'){
        console.log('Function canceled'); 
    }else{
        console.log(err); 
    }
}