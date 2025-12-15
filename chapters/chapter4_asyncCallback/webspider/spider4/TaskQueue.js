import { EventEmitter } from 'node:events'

export class TaskQueue extends EventEmitter {
  constructor(concurrency) {
    super()
    this.concurrency = concurrency
    this.running = 0
    this.queue = []
  }

  pushTask(task) {
    this.queue.push(task) //done => {}을 this.queue 맨뒤에 저장. 
    process.nextTick(this.next.bind(this))//현재 실행 중 코드 끝나면 next 시행. 
    return this
  }

  next() {
    if (this.running === 0 && this.queue.length === 0) {
      return this.emit('empty')
    }

    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()  //이 task가 done => {spiderTask}
      task(err => { //task 실행. 그리고 이떄 전달해주는 인자인 err => {} 이 done으로 !!!
        if (err) {
          this.emit('error', err)
        }
        this.running--
        process.nextTick(this.next.bind(this))
      })
      this.running++
    } // task 인 spiderTask() 가 시행 되면서 위의 done 함수인 ( err = >{}) 을 spiderTask 인자에 포함해 전달한다. 
    
  }

  stats() {
    return {
      running: this.running,
      scheduled: this.queue.length,
    }
  }
}