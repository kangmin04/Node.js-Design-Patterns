import {PassThrough} from 'node:stream'
import {createReadStream, createWriteStream} from 'node:fs'

class lazyStream extends PassThrough{
    constructor(input , options){
        super(options);
        this.input = input ;
        this.factory = () => {
            return createReadStream(this.input)
        };
        this.initialized = false; 
    }

    // Node.js 스트림 시스템은 소비자가 데이터를 원할 때, 
    // Readable 스트림의 내부 메서드인 _read()를 자동으로 호출해줍니다
    _read(size){
        super._read(size); //상위 클래스 super은 습관화하자..... 
        if(!this.initialized){
            const realStream = this.factory();
            console.log('factory function 실행됨')
            realStream.pipe(this)
            realStream.on('error' , (err) => this.emit('error' , err))
            this.initialized = true; 
        }
      
    }
}


const lazyStreamInstance = new lazyStream('file.txt'); 
setTimeout( () => {
    lazyStreamInstance
    .pipe(process.stdout)
    .on('error' , (err) => console.error(err)) 
} , 3000
)