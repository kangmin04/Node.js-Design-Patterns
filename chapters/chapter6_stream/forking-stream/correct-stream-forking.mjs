import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { PassThrough } from 'node:stream';

const filename = 'file.txt'; // 분석할 파일

const inputStream=createReadStream(filename) ; 

const splitter = new PassThrough(); 

const sha1Stream = createHash('sha1').setEncoding('hex');
const md5Stream = createHash('md5').setEncoding('hex');

inputStream.pipe(splitter)
splitter.pipe(sha1Stream).pipe(createWriteStream(`${filename}.sha1`));
splitter.pipe(md5Stream).pipe(createWriteStream(`${filename}.sha1`));


