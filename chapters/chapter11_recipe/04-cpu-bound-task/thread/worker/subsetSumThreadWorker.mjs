/* 부모 코드에서 ProcessPool에 의해 실행될 자식 코드(수행할 자식 프로세스 정의)임. 
   CPU를 많이 상요하는 subsetSum을 돌릴것.  
*/
import { SubsetSum } from "../../interleaving/subsetSum.mjs";
import { parentPort } from "node:worker_threads";

parentPort.on('message', msg => { // 기존 process에선 process.on으로 자식 부모 통신했으나 thread에선 parentport로 복사하여 전달
    const subsetSum = new SubsetSum(msg.sum, msg.set)
    subsetSum.on('match', data => {
        parentPort.postMessage({event: 'match', data:data}) //IPC 연결된 상태면 process.send는 자식에서 부모로 전달가능! 
    })
    subsetSum.on('end', data => {
        parentPort.postMessage({event:'end' , data:data}) //IPC 연결된 상태면 process.send는 자식에서 부모로 전달가능! 
    })

    subsetSum.start(); 
})

