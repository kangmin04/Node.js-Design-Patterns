function delay(milliseconds) {
    return new Promise((resolve, _reject) => {
      setTimeout(() => {
        resolve(Date.now())
      }, milliseconds)
    })
  }
  


function nonLeakingLoop(){
    return new Promise((resolve, reject) => {
        (function internalLoop(){
            delay(1)
                .then(() => {
                    console.log('tick ' + Date.now())
                    internalLoop()
                }).catch(err => reject(err))
        })()
    
    })
}

nonLeakingLoop(); 


