import {Writable} from 'node:stream'
import {writeFile} from 'node:fs/promises'
import { dirname } from 'node:path'
import { mkdirp } from 'mkdirp' //make folder in parameter root(folder

export class ToFileStream extends Writable{
    constructor(options){
        super({...options , objectMode: true})
    }

    _write(chunk , _encoding , cb){
        mkdirp(dirname(chunk.path))
            .then(() => writeFile(chunk.path , chunk.content))
            .then(() => cb())
            .catch(cb)
    }


}
//Object Mode 없는 경우 -< 

// TypeError [ERR_INVALID_ARG_TYPE]: The "chunk" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received an instance of Object
//     at _write (node:internal/streams/writable:482:13)