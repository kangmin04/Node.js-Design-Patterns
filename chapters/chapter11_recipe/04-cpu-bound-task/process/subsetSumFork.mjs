import { EventEmitter } from "node:events";
import { join } from "node:path";
import { ProcessPool } from "./processPool.mjs";

const workerFile = join(import.meta.dirname, 'workers', 'subsetSumProcessWorker.mjs')
const workers = new ProcessPool(workerFile, 2)
export class SubsetSum extends EventEmitter {
    constructor(sum, set) {
      super()
      this.sum = sum
      this.set = set
    }

    async start(){
        const worker = await workers.acquire()
        worker.send({sum: this.sum, set: this.set}) /*  IPC channels serialize data automatically (JSON) -> enable to send objects */
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