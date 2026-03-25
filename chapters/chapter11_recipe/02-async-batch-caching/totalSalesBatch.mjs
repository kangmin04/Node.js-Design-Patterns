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