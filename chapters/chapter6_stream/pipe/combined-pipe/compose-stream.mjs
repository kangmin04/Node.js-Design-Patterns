import { compose, pipeline } from 'node:stream'
import { createReadStream, createWriteStream } from 'node:fs'
import { Transform } from 'node:stream'
import { promisify } from 'node:util'

const pipelineAsync = promisify(pipeline);

// A reusable transform stream
const toUpperCase = new Transform({
  transform(chunk, _enc, done) {
    this.push(chunk.toString().toUpperCase())
    done()
  },
})

// Another reusable transform stream
const addHeader = new Transform({
    transform(chunk, _enc, done) {
        this.push('--- START OF FILE ---\n' + chunk)
        done()
    }
})

// 1. CREATE a reusable component with compose().
// This is LAZY. It does nothing on its own. It just returns a new stream.
const formattingStream = compose(addHeader, toUpperCase);

// 2. EXECUTE the flow with pipeline(), using the composed stream as a step.
// This is EAGER. It starts the data flowing from the file to the pipeline.
async function run() {
  try {
    await pipelineAsync(
      createReadStream('/home/user/node-design-system/package.json'),
      formattingStream, // Using our reusable building block here
      createWriteStream('package-uppercase.json.md')
    )
    console.log('Pipeline finished successfully!')
  } catch (err) {
    console.error('Pipeline failed:', err)
  }
}

run();