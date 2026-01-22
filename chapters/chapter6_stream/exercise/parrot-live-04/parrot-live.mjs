import {Readable} from 'node:stream'
import {readFileSync , readdirSync} from 'node:fs'
import { join } from 'node:path';

const CLEAR_SCREEN = '\x1B[2J'; // 화면 전체를 지웁니다.
const CURSOR_TO_HOME = '\x1B[H';  // 커서를 맨 위 왼쪽으로 이동합니다.

const directory= readdirSync('./frames')
const frames = directory.map((fileName) => {
    // return readFileSync(`./frames/${fileName}` , 'utf-8')
    return readFileSync(join('./frames', fileName) , 'utf-8')
})

class AnimationStream extends Readable{
    constructor(frames,limit,options){
        super(options);
        this.index = 0;
        this.limit = limit; 
        this.frames = frames; 
    }

    _read(){
        const frame = this.frames[this.index]
        const data = `${CLEAR_SCREEN}${CURSOR_TO_HOME}${frame}`
        
        setTimeout(() => {
            this.push(data)
            this.index++
            if(this.index === this.frames.length){
              this.index = 0 ; 
            }
        } , 70)
        
    }
}

const test = new AnimationStream(frames); 

test.pipe(process.stdout)