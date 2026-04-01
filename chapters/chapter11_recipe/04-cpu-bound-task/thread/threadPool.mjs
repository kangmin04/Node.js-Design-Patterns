import { Worker } from "node:worker_threads";

export class ThreadPool {
    constructor(file, poolMax){
        this.file = file // 자식 프로세스가 실행할 파일 경로
        this.poolMax = poolMax; 
        this.pool = [] //아무 일 안하는 자식 프로세스(worker) 저장. 
        this.active = [] //현재 실행중인 자식 프로세스 
        this.waiting = [] //active 배열 꽉찼을 때부턴 여기에 저장 
    }

    acquire(){ 
        return new Promise((resolve, reject) => {
            let worker; 
            if(this.pool.length > 0){ // 사용 가능한 프로새스 존재 
                worker = this.pool.pop();

                // if(worker.timeoutId){
                //     console.log(`clear timeoutid: ${worker.timeoutId}, worker pid: ${worker.pid}`)
                //     clearTimeout(worker.timeoutId)
                // }
                this.active.push(worker); 
                return resolve(worker)
            }

            if(this.active.length >= this.poolMax){ 
                return this.waiting.push({resolve, reject})
            }
            
            worker = new Worker(this.file); 
            worker.once('online',  () => {
                    this.active.push(worker); 
                    resolve(worker)
                })
                
            //exit:  process.exit으로 스스로 종료할때나, 비정상오류(크래시) 발생, worker.kill(부모가 강제종료) 한 경우 exit 이벤트 발생함.
            worker.once('exit', code => {
                console.log(`Worker exited with code ${code}`)
                this.active = this.active.filter(w => worker !== w)
                this.pool = this.pool.filter(w => worker !== w)
              })
        })

    }

    release(worker){ // 다 쓴 worker(자식 프로세스 반납함)
        if(this.waiting.length > 0){  /* 한 프로세스가 작업 마치고 반납됐는데, 마침 다른 곳에서 자식 프로세스를 요청해둔 상황. -> 바로 waiting 에서 대기 중이던 요청을 가져와서 resolve() 호출함. -> await pool.acquire()에서 대기 중이던 콛가 worker을 받고 다음 작업을 시작하게됨. 즉 최대한 프로세스를 쉬지않게(pool에 안넣음)함! */
            const {resolve} = this.waiting.shift(); 
            return resolve(worker); 
        }
        /* 기다리는 작업 없는경우 일하는 중인 프로세스 목록(active)에서 worker 제거 후 놀고있는 프로세스 목록(pool)에 추가함. 다음 acquire()*/
        this.active = this.active.filter( w => worker !== w)

        /* idle한 프로세스 kill하기 */
        // worker.timeoutId = setTimeout(() => {
        //     worker.kill(); 
        //     console.log(`${worker.pid} killed`); 
        // } , 10* 1000)
        // console.log(`[Pool <-] PID: ${worker.pid} pushed to pool with timeoutId: ${worker.timeoutId}`);
        this.pool.push(worker); 
    }
}