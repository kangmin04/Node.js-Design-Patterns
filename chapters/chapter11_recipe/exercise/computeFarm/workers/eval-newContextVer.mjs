import { parentPort, workerData } from 'worker_threads';
import { runInNewContext } from 'vm'; // runInNewContext는 script, runInContext 단축.

parentPort.on('message', ({code, args}) => {
    
    // const func = eval(code); 
    // const res = func(...args);
    try{
        const sandbox = {}; //코드를 실행할 샌드박스 객체
        const func = runInNewContext(`(${code})`, sandbox, {timeout: 1000})
        const res = func(...args)
        parentPort.postMessage(res);
        
    }catch(err){
        parentPort.postMessage({error: err.message})
    }

    parentPort.close()
    
})
