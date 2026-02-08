import { createLoggingWritable } from "./loggingWritable.mjs";
import {createWriteStream} from 'node:fs'

const writable = createWriteStream('test.txt')
const writableProxy = createLoggingWritable(writable); 

writableProxy.write('first chunk'); 
writableProxy.write('second chunk'); 
writable.write('THIS IS NOT LOGGED IN CONSOLE')
writableProxy.end(); 


