/* 
  Thread 방식의 경우, 프로세스를 새로 띄우는 fork에 비해 메모리 소비량과 생성 오버헤드가 극도로 적음. 대량의 데이터를 스레드 간에 주고받아야 할 때 복사 비용이 들지 않는 SharedArrayBuffer 등을 활용할 수 있어, Node.js 내부에서 순수 연산 중심의 작업을 다룰 때 성능이 가장 뛰어납니다.
*/

import { EventEmitter } from "node:events";
import { join } from "node:path";
import { ThreadPool } from "./threadPool.mjs";

const workerFile = join(import.meta.dirname, 'worker', 'subsetSumThreadWorker.mjs')
const workers = new ThreadPool(workerFile, 2)

export class SubsetSum extends EventEmitter {
    constructor(sum, set) {
      super()
      this.sum = sum
      this.set = set
    }

    async start(){
        const worker = await workers.acquire()
        worker.postMessage({sum: this.sum, set: this.set}) /* */
        const onMessage = msg => {
            if (msg.event === 'end') {// subsetSum task 종료될 경우 
              worker.removeListener('message', onMessage)
              workers.release(worker)
            }
      
            this.emit(msg.event, msg.data)
          }
      
          worker.on('message', onMessage)
    }
}