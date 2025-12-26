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
    // return this
  }

  next() {
    if (this.running === 0 && this.queue.length === 0) {
      return this.emit('empty')
    }

    while (this.running < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()  //이 task가 done => {spiderTask}
      task()
        .catch(err => {
          this.emit('error', err)
        }
        ).finally(() => {
          this.running--
          this.next();  //화살표함수기에 여기서 this는 상위 스코프 .. 
          //상위스코프는 this.next를 감싸는 가장 가까운 함수 ..! 
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