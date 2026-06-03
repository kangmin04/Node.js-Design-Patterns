import {readFile , writeFile} from 'node:fs/promises'
import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
const gzipPromise = promisify(gzip); 
const filename = process.argv[2]; 

const data = await readFile(filename); 
const gzippedData = await gzipPromise(data); 
await writeFile(`${filename}.gz`, gzippedData); 
console.log('압축 완료');