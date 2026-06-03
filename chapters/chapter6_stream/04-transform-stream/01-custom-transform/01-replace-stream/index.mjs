// index.js
import { ReplaceStream } from './replaceStream.mjs'
const replaceStream = new ReplaceStream('World', 'Node.js')
replaceStream.on('data', chunk => process.stdout.write(chunk.toString()))
replaceStream.write('Hello W')
replaceStream.write('orld!')
replaceStream.end('\n')