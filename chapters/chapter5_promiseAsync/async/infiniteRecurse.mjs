function delay(milliseconds) {
    return new Promise((resolve, _reject) => {
      setTimeout(() => {
        resolve(Date.now())
      }, milliseconds)
    })
  }
  
  function leakingLoop() {
    return delay(1)
      .then(() => {
        console.log(`Tick ${Date.now()}`)
        leakingLoop()
      })
  }
  for (let i = 0; i < 1e6; i++) {
    leakingLoop()
  }


  function nonLeakingLoop() {
    delay(1)
      .then(() => {
        console.log(`Tick ${Date.now()}`)
        nonLeakingLoop()
      })
  }

  // for (let i = 0; i < 1e6; i++) {
  //   nonLeakingLoop()
  // }

  setInterval(() => {
    console.log('Heap Used:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');
  }, 10);