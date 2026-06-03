//IMPLEMENT TO SHOW PIPE() , PIPELINE() returns only last stream of composite. 
import { createReadStream, createWriteStream } from 'node:fs'
import { Transform, pipeline } from 'node:stream'
import assert from 'node:assert/strict'
const streamA = createReadStream('/home/user/node-design-system/package.json')
const streamB = new Transform({
  transform(chunk, _enc, done) {
    this.push(chunk.toString().toUpperCase())
    done()
  },
})
const streamC = createWriteStream('package-uppercase.json.md')
const pipelineReturn = pipeline(streamA, streamB, streamC, () => {
  // handle errors here
})
assert.equal(streamC, pipelineReturn) // valid
const pipeReturn = streamA.pipe(streamB).pipe(streamC)
assert.equal(streamC, pipeReturn) // valid
console.log(streamC === pipeReturn)

// assert : Behavior: If the assertion passes (the values are loosely equal), nothing happens. 
// If it fails, it throws an AssertionError, which will typically fail the test case.

// .pipe() method returns its destination stream to allow for chaining. 
// Therefore, pipeReturn is not a new stream but a reference to the exact same object as streamC.