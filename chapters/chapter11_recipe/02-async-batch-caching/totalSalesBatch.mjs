import { totalSales as totalSalesRaw } from "./totalSales.mjs";

const runningRequests = new Map(); //key value 형태로 promise 저장 
export function totalSales(product){
    if(runningRequests.has(product)){
        return runningRequests.get(product); 
    }
    //실제 작업 시키고, 프로미스를 그대로 req에 넣음 
    const resultPromise = totalSalesRaw(product); 
    runningRequests.set(product, resultPromise); 
    resultPromise.finally(() => {
        runningRequests.delete(product)
    })

    return resultPromise; 
}


/* 내가 batching을 구현해야한다면 ... 
    const batching = new Map(); 
    const result = totalSalesRaw(product) // async 함수라 promise 리턴함. 
    이때 result를 batching함.
    map.set(product, result) -> 현재 찾고있는, 작업이 들어간 product에 대해서는 오는 모든 요청을 promise로 리턴. 
    BUT batching이기에 프로미스 종료 시 map에서 삭제해줌. 
*/