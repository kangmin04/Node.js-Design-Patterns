import { totalSales as totalSalesRaw } from "./totalSales.mjs";
const CACHE_TTL = 30 * 1000 //30 seconds
const cache = new Map(); 

export function totalSales(product){
    if(cache.has(product)){
        return cache.get(product); 
    }
    
    const resultPromise = totalSalesRaw(product); 
    cache.set(product, resultPromise); 
    resultPromise.then(() => {
        setTimeout(() => {
            cache.delete(product)
        }, CACHE_TTL)
    }).catch((err) => {
        cache.delete(product)
        throw err
    })


    return resultPromise; 
}