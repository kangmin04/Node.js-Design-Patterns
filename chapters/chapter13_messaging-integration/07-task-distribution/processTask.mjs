import isv from 'indexed-string-variation'
import { createHash } from 'node:crypto'
export function processTask(task){
    const strings = isv({
        alphabet: task.alphabet,
        from: BigInt(task.batchStart),
        to: BigInt(task.batchEnd),
    })

    let first
    let last 
    for (const string of strings) {
        if (!first) {
          first = string
        }
    
        const digest = createHash('sha1').update(string).digest('hex')
    
        if (digest === task.searchHash) {
          console.log(`>> Found: ${string} => ${digest}`)
          return string
        }
        last = string
      }
      console.log(
        `Processed ${first}..${last} (${task.batchStart}..${task.batchEnd})`
      )
}