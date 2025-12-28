function delayError(milliseconds) {
    return new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Error after ${milliseconds}ms`))
      }, milliseconds)
    })
  }

async function playingWithErrors(throwSyncError) {
    try {
      if (throwSyncError) {
        throw new Error('This is a synchronous error') //동기적 에러 -> 즉시 catch로 . 
      }
      await delayError(1000)
    } catch (err) {
      console.error(`We have an error: ${err.message}`)
    } finally {
      console.log('Done')
    }
}

playingWithErrors(false);
