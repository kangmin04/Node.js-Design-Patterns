setTimeout(() => {console.log('setTimeout')} , 0)
setImmediate(() => {console.log('setImmediate')})
process.nextTick(() => {console.log('nexttick')})
console.log('sync')