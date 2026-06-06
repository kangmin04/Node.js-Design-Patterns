export function createObservable(target , observer){
    const observable = new Proxy(target , {
        set(obj , property , value){
            if(obj[property] !== value){
                const prev = obj[property]; 
                obj[property] = value; 
                observer({property , prev , curr : value})
            }
            return true; 
        }
    })

    return observable ; //? 
}