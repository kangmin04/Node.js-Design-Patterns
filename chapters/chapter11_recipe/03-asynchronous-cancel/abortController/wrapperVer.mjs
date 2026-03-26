/*
    simple, wrapper 방식 전부 내부의 cancellation object를 manual하게 config. 
    BUT third party의 경우 각각 다른 mechanism으로 구성되고, 해당 cancellation obj를 접근 불가할수도
    --> standard library. AbortController
*/

import { asyncRoutine } from "./asyncRoutine.mjs";

async function throwIfAbortedWrapper(abortSignal, asyncFunc, ...args){
    abortSignal.throwIfAborted(); 
    return asyncFunc(...args); 
    
}
async function cancelable(abortSignal){
    const resA = await throwIfAbortedWrapper(abortSignal, asyncRoutine, 'A') 
    console.log(resA)
    /*
        명시적으로 logging할경우. 
        1. 관심사 분리(단일 책임 원칙)
            - throwIfAbortedWrapper은 중단신호를 확인하고 주어진 비동기 함수를 실행한다는 명확한(단일한) 책임 가짐 
            - 그 결과를 처리하는 방법은 분리! 
        2. 높은 재사용성
            - 다른 함수에서 함수를 그대로 결과만 리턴하여 재사용 가능 
        3. 명확한 코드 흐름 
            - 읽는 관점에서, 함수 호출해서 결과 얻고, 그 결과를 출력하는구나 ~ 생각 가능

    */
    
    const resB = await throwIfAbortedWrapper(abortSignal, asyncRoutine, 'B') 
    console.log(resB); 
    
    const resC = await throwIfAbortedWrapper(abortSignal, asyncRoutine, 'C') 
    console.log(resC); 
}

const ac = new AbortController()

setTimeout(() => {
    ac.abort(); //trigger cancellation.  인자로 Error 객체주면 해당 에러로 나옴. Default는 'AbortError' 
}, 100); 

try {
    await cancelable(ac.signal); // async 함수에 signal 전달 후 signal.throwIfAborted() 혹은 if(signal.aborted)로 abort됐는지 체크 가능.  
    //OR signal.addEventListner('abort', () => {})로 가능. 
} catch (err) {
    if(err.name === 'AbortError'){
        console.log('Function canceled'); 
    }else{
        console.log(err); 
    }
} finally{
    //async 작업 중 해제한 작업에 대한 resoure 정리. 
}