/* 부모 코드에서 ProcessPool에 의해 실행될 자식 코드(수행할 자식 프로세스 정의)임. 
   CPU를 많이 상요하는 subsetSum을 돌릴것.  
*/
import { SubsetSum } from "../../interleaving/subsetSum.mjs";

process.on('message', msg => { // 부모 ->자식으로 send 시 message event 발생
    const subsetSum = new SubsetSum(msg.sum, msg.set)
    subsetSum.on('match', data => {
        process.send({event: 'match', data:data}) //IPC 연결된 상태면 process.send는 자식에서 부모로 전달가능! 
    })
    subsetSum.on('end', data => {
        process.send({event:'end' , data:data}) //IPC 연결된 상태면 process.send는 자식에서 부모로 전달가능! 
    })

    subsetSum.start(); 
})

process.send('ready'); 