/*
    한번 시작된 프로미스는 종료나 취소 기능이 없기에
    프로미스로 인해 실행된 비동기 작업은 완료되거나 오류가 발생할 때까지 계속 실행됨. 
    비동기 작업을 중단 시키려면 코드 외부에서 중단을 알리고 프로미스 내부에서 요청을 주기적으로 확인하여 작업을 스스로 멈추는 방식을 사용해야함. 
*/

import { asyncRoutine } from "./asyncRoutine.mjs";
import { CancelError } from "./cancelError.mjs";

async function cancelable(cancelObj){
    const resA = await asyncRoutine('A'); 
    console.log(resA); 
    if(cancelObj.cancelRequested){
        throw new CancelError()
    }

    const resB = await asyncRoutine('B'); 
    console.log(resB); 
    if(cancelObj.cancelRequested){
        throw new CancelError()
    }

    const resC = await asyncRoutine('C')
    console.log(resC); 
}


const cancelObj = {cancelRequested : false}; 

setTimeout(() => {
    cancelObj.cancelRequested = true
}, 100); 

try {
    await cancelable(cancelObj);
} catch (err) {
    if(err instanceof CancelError){
        console.log('Function canceled'); 
    }else{
        console.log(err); 
    }
}