
async function asyncFunction(signal){
    await nestedFunction(db, signal)
    await nestedFunction(network, signal)
    await nestedFunction(thirdapi, signal)
}

async function nestedFunction(asyncFunc, abortSignal){
    abortSignal.throwIfAborted(); 
    await asyncFunc(); 
}

async function db(){
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('db async')
            resolve()
        }, 100)
    })
    
}

async function network(){
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('network')
            resolve()
        }, 100)
    })
}

async function thirdapi() {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('api')
            resolve()
        }, 200)
    })
}

const ac = new AbortController()
setTimeout(() => {
    ac.abort(); 
}, 100);

try{
    await asyncFunction(ac.signal); 
}catch (err) {
    if(err.name === 'AbortError'){
        console.log('Function canceled'); 
    }else{
        console.log(err); 
    }
}