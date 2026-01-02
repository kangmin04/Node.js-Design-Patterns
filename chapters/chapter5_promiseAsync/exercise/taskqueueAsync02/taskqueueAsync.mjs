import { EventEmitter } from 'node:events'

export class TaskQueue extends EventEmitter {
  constructor(concurrency) {
    super()
    this.concurrency = concurrency
    this.running = 0
    this.queue = []
  }

  pushTask(task) {
    this.queue.push(task)
    process.nextTick(this.next.bind(this))
  }

  next() {
    if (this.running === 0 && this.queue.length === 0) {
      return this.emit('empty')
    }

    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()
      this.running++

      // We wrap the task execution in an async IIFE (Immediately Invoked Function Expression).
      // This allows us to use await for a single task's lifecycle.
      // Crucially, we DO NOT await this IIFE itself. We fire and forget.
      // This is what allows the while loop to continue and start other tasks concurrently.
      (async () => {     //async 만나면 ... -> 1. 함수 내부 코드 실행 2. 함수 끝나길 기다리자않고 즉시 promise 반환
        //while 내 iife 함수는 반환된 프로미스를 저장도 안함. 그냥 실행만하고 잊어버리는 .... 
        try {
          await task() 
        } catch (err) {
          this.emit('error', err)
        } finally {
          this.running--
          this.next()
        }
      })()
    }
  }

  stats() {
    return {
      running: this.running,
      scheduled: this.queue.length,
    }
  }
}