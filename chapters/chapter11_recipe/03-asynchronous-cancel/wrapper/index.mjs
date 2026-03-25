import { asyncRoutine } from "./asyncRoutine.mjs";
import { CancelError } from "./cancelError.mjs";
import { createCancelWrapper } from "./wrapper.mjs";

async function cancelable(callIfNotCanceled){
    const resA = await callIfNotCanceled(asyncRoutine, 'A')
    console.log(resA); 

    const resB =  await callIfNotCanceled(asyncRoutine, 'B')
    console.log(resB); 

    const resC = await callIfNotCanceled(asyncRoutine, 'C')
    console.log(resC); 
}

const {cancel, callIfNotCanceled} = createCancelWrapper(); 

setTimeout(() => {
    cancel()
}, 100); 

try {
    await cancelable(callIfNotCanceled);
} catch (err) {
    if(err instanceof CancelError){
        console.log('Function canceled'); 
    }else{
        console.log(err); 
    }
}