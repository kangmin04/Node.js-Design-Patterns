import { setImmediate } from "node:timers/promises";

export async function fetchWithRetry(asyncFn, maxRetries){
    
    for(let i=1 ; i <= maxRetries ; i++){
        try{
            let res = '';
            res = await asyncFn(i); 
            return res; 
        }catch(err){
            if(i===maxRetries){
                return`${err.message} occured last ${i}`
            }
            continue; 
        }

    }
}
