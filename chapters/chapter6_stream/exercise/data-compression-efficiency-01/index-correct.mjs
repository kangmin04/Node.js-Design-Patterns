import { createReadStream , createWriteStream} from 'node:fs';
import {createBrotliCompress , createGzip , createDeflate} from 'node:zlib'

const filename = process.argv[2]
const inputStream = createReadStream(filename);  //단 한번만

console.time('brotli')
const brotliDestination= createWriteStream(`${filename}.br`)
brotliDestination.on('finish' , () => {
    console.timeEnd('brotli')
})

inputStream.pipe(createBrotliCompress()).pipe(brotliDestination)

console.time('gzip')
const gzipStream = createGzip();
const gzipDestination = createWriteStream(`${filename}.gz`);
gzipDestination.on('finish' , () => {
    console.timeEnd('gzip')
})
inputStream.pipe(gzipStream).pipe(gzipDestination);

console.time('deflate')
const deflateStream = createDeflate();
const deflateDestination = createWriteStream(`${filename}.deflate`);
deflateDestination.on('finish' , () => {
    console.timeEnd('deflate')
})
inputStream.pipe(deflateStream).pipe(deflateDestination);