import {Transform} from 'node:stream'
export class ConcurrentStream extends Transform{
    constructor( concurrency,userTransform , opts){
        super({objectMode : true , ...opts})
        this.userTransform = userTransform;
        this.running = 0; 
        this.concurrency = concurrency; 
        this.terminateCb = null; 
        this.continueCb = null; 
    }

    _transform(chunk , enc , done){
        this.running++; 
        this.userTransform(chunk ,
            enc , 
            this.push.bind(this) , 
            this._onComplete.bind(this) //각 비동기 작업 끝날때마다 호출! 
        )
        if(this.running < this.concurrency){
            done(); // let stream to get next file
        }else{
            console.log('stuck')
            this.continueCb = done; //continue Cb에 담아둔 후 async operation 끝나면 해당 콜백 실헹
        }
    }

    _flush(done){ //모든 데이터가 스트림으로 들어오면 -> _flush() 호출됨
        if(this.running > 0){
            this.terminateCb = done; //아직 running 중이면 이때 멈추면 안됨. 나중에 작업 다 끝나면 this.terminateCb 호출하면됨
        }else{
            done() //done은 스트림 끝낼 때 호출해야함. 
        }
    }

    _onComplete(err){  //async 작업 종료 될 때마다 호출됨. 
        this.running--; 
        if(err){
            return this.emit('error' , err)
        }
        if(this.running === 0 ) this.terminateCb?.()
            //만약 마지막 running이었으면 -> _flush가 남겨둔 종료 콜백있는지 확인 후(Optional chaining) 있는경우에만 실행
        //?. 문법 : this.terminateCb가 null , undefined가 아닌 경우에만 실행. 


        // if(this.running > 0 && this.continueCb ){
        //     this.continueCb();  //이건 cb을 초기화 안함. 만약, async 작업이 transform보다 먼저 두번 일어나면 -> 같은 콜백이 두번 호출됨. 
        // } //여기서 this.continuCb는 스트림에서 done이고 , Node의 스트림은 done이 한번만 호출된다고 가정함. 
        
        const temp = this.continueCb;
        this.continueCb = null ; 
        temp?.(); 

    }
}

//     데이터 조각들이 스트림에 들어오고, _transform이 여러 번 호출되며 여러 비동기 작업이 동시에 시작됩니다. (running 카운터 증가)
// 모든 데이터 조각이 스트림에 다 들어오면, 스트림은 _flush를 호출합니다.
// _flush 시점에 아직 5개의 비동기 작업이 실행 중이라면 (running이 5), _flush는 종료 콜백 done을 this.terminateCb에 저장하고 아무것도 안 한 채 종료됩니다.
// 이제 비동기 작업들이 하나씩 끝나기 시작합니다. 끝날 때마다 _onComplete가 호출되고, running 카운터는 4, 3, 2, 1로 줄어듭니다. 이때는 terminateCb를 호출하지 않습니다.
// 마침내 마지막 비동기 작업이 끝나고 _onComplete가 호출됩니다. running은 0이 됩니다.
// 이때 if (this.running === 0) 조건이 참이 되고, _flush가 저장해두었던 this.terminateCb (즉, done 함수)를 호출합니다.
// done 함수가 호출되면서 스트림은 모든 작업이 안전하게 완료되었음을 알고, 비로소 'finish' 이벤트를 발생시키며 완전히 종료됩니다.
// }