import { createReadStream, createWriteStream } from 'node:fs'
import { createHash } from 'node:crypto'
const filename = process.argv[2]
const sha1Stream = createHash('sha1').setEncoding('hex')
const md5Stream = createHash('md5').setEncoding('hex')
const inputStream = createReadStream(filename)
inputStream.pipe(sha1Stream).pipe(createWriteStream(`${filename}.sha1`))
inputStream.pipe(md5Stream).pipe(createWriteStream(`${filename}.md5`))

// same data chunk to sha1 , md5 
//but they only read.  and dont modify it -> NO RACE CONDITIONS

 //The sha1Stream consumes the original file chunks and 
 // produces a completely new, different output (the hash). It doesn't alter the original chunks that are also being sent to the md5Stream.

 
 

//  // A DANGEROUS, "MODIFYING" TRANSFORM STREAM
// const myBadStream = new Transform({
//   transform(chunk, encoding, callback) {
//     chunk[0] = 97; // Modifies the first byte of the original chunk!
//     this.push(chunk); // Passes the modified chunk along
//     callback();
//   }
// });