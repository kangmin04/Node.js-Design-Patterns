import { fork } from "node:child_process";
/* 여러 개의 자식 프로세스(worker)를 미리 만들어 놓고, 
   필요할 때마다 빌려 쓰고 다 쓰면 반납하는 방식으로 이러한 문제를 해결 */
export class ProcessPool {
    constructor(file, poolMax){
        this.file = file // 자식 프로세스가 실행할 파일 경로
        this.poolMax = poolMax; 
        this.pool = [] //아무 일 안하는 자식 프로세스(worker) 저장. 
        this.active = [] //현재 실행중인 자식 프로세스 
        this.waiting = [] //active 배열 꽉찼을 때부턴 여기에 저장 
    }

    acquire(){ // 사용 가능한 자식프로세스를 요청해두고, 가능해지면 Promise로 반환함. 
        return new Promise((resolve, reject) => {
            let worker; 
            if(this.pool.length > 0){ // 사용 가능한 프로새스 존재 
                worker = this.pool.pop(); 
                this.active.push(worker); 
                return resolve(worker)
            }

            if(this.active.length >= this.poolMax){ //가용 프로세스 개수 초과 시 waiting에 넣음 
                return this.waiting.push({resolve, reject})
            }
            // pool은 비었지만, 아직 pool의 최대치에 도달하지않은경우 자식 프로세스 생성 
            worker = fork(this.file); 
            worker.once('message', message => {
                if(message === 'ready'){ // 생성된 프로세스가 ready 보내면 초기화 완료된 것. -> active 목록에 추가하고 요청자에게 반환
                    this.active.push(worker); 
                    return resolve(worker)
                }
                //ready가 아니면 kill해야함. ( message 보냈다면 자식프로세스가 부모 프로세스에게 무언가를 보낸것. 근데 ready가 아니면 준비된 상태가 아닌 상태에서 메세지를 받은것. )
                worker.kill(); 
                reject(new Error('Improper process start'))
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
        this.pool.push(worker); 
    }
}