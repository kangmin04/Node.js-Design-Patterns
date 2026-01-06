
import { Transform } from 'stream';

class ReplaceText extends Transform {
  constructor(options) {
    super(options);
    this.searchString = options.searchString;
    this.replaceString = options.replaceString;
  }

  _transform(chunk, encoding, callback) {
    const transformedChunk = chunk.toString().replace(new RegExp(this.searchString, 'g'), this.replaceString);
    this.push(transformedChunk);
    callback();
  }
}

const searchString = 'World';
const replaceString = 'Node.js';

const replaceStream = new ReplaceText({ searchString, replaceString });

console.log(`Type something with the word "World" and it will be replaced with "Node.js"`);
// process.stdin.pipe(replaceStream).pipe(process.stdout);

replaceStream.on('data', chunk => process.stdout.write(chunk.toString()))
replaceStream.write('Hello W')
replaceStream.write('orld!')
replaceStream.end('\n')