function delay(milliseconds) {
    return new Promise((resolve, _reject) => {
      setTimeout(() => {
        resolve(Date.now())
      }, milliseconds)
    })
  }
  
  async function playingWithDelays() {
    process.nextTick(() => console.log('test code for micro taskqueue')); 
    console.log('Delaying...', Date.now()) //execute immediately. 
   
    const timeAfterOneSecond = await delay(1000) //await만나면 playingwDelay함수 자체가 pending promsie를 리턴. 
   
    console.log(timeAfterOneSecond)
   
    const timeAfterThreeSeconds = await delay(3000)
    console.log(timeAfterThreeSeconds)
  
    return 'done'
  }

//   const a = playingWithDelays().then(result => {
//     console.log(`After 4 seconds: ${result}`)
//   })

// (async () => {
//     const result = await playingWithDelays()
//     console.log(`After 4 seconds: ${result}`)
//   })()

const result = await playingWithDelays()
console.log(`After 4 seconds: ${result}`)