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