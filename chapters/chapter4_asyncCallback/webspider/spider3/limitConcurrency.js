function makeSampleTask(name) {
  return cb => {
    console.log(`${name} started`)
    setTimeout(() => {
      console.log(`${name} completed`)
      cb()
    }, Math.random() * 2000)
  }
}

const tasks = [
  makeSampleTask('Task 1'),
  makeSampleTask('Task 2'),
  makeSampleTask('Task 3'),
  makeSampleTask('Task 4'),
  makeSampleTask('Task 5'),
  makeSampleTask('Task 6'),
  makeSampleTask('Task 7'),
]

const concurrency = 2
let running = 0
let completed = 0
let nextTaskIndex = 0

function next() {
  while (running < concurrency && nextTaskIndex < tasks.length) {
    const task = tasks[nextTaskIndex++]
    task(() => {
      if (++completed === tasks.length) {
        return finish()
      }
      running--
      next()
    })
    running++
  }
}
next()

function finish() {
  // all the tasks completed
  console.log('All tasks executed!')
}





// const tasks = [
//     // ...
//   ]
//   const concurrency = 2
//   let running = 0
//   let completed = 0
//   let nextTaskIndex = 0
//   function next() { // 1
//     while (running < concurrency && nextTaskIndex < tasks.length) {
//       const task = tasks[nextTaskIndex++]
//       task(() => { // 2
//         if (++completed === tasks.length) {
//           return finish()
//         }
//         running--
//         next()
//       })

//       running++ //task 비동기 작업 들어가자 마자 바로 running 증가시킴. -> 하나의 작업이 실행중이라는걸 나타냄

//     }
//   } 
//   //작업이 두개 실행 중이면 while내 running < concurrency로 인해 루프 멈춤. 
//   // 2개 작업만 실행중이고 , 새로운 작업은 멈춤. 
//   //작업이 끝나면 , 인자로 전달된 콜백함수가 시행
//   //completed  증가 시키고 , 아직 남아있으니 , 
//   //running 감소시켜서 ( 실행 중 작업이 하나 종료됨)
//   //next() 호출. -> 새로운 작업 시작./ 


//   next()


//   function finish() {
//     // all the tasks completed
//   }

