const lazyPromise = () => {
   return  new Promise((resolve) => {
        resolve('a'); 
    })
    
}



lazyPromise().then(v => console.log(v)) //must invoke function before use then