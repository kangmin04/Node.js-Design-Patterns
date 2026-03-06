import assert from 'node:assert/strict'
import {once} from 'node:events'
import {suite, test} from 'node:test'
import { scheduler, setImmediate } from 'node:timers/promises'
import { TaskQueue } from './Taskqueue.mjs'
/*
    유사한 test끼리 그룹화 + 병렬로 빠르게 + async 길어질 때  500ms로 제한
*/
suite("TaskQueue" , {concurrency: true, timeout:500} , () => {
    test.todo('All tasks are executed and empty is emitted' , async () => {
        const queue = new TaskQueue(2); 
        /* 
            Promise.withResolvers() 기존 new Promsise scope 내부에서 쓰던 resolve, reject 함수를 프로미스 외부로 분리 가능 
            비동기 작업에 resolve 두고, 해당 작업 끝나면 -> 외부의 resolve 함수를 호출하여 promise완료시킴
        */
        const task1status = Promise.withResolvers(); 
        const task2status = Promise.withResolvers(); 
        let task1completed = false;
        let task2completed = false;

        const task1 = async () => {
            await setImmediate(); 
            task1completed = true; 
            task1status.resolve(); 
        }


        const task2 = async () => {
            await setImmediate(); 
            task2completed = true; 
            task2status.resolve(); 
        }
        //act
        queue.pushTask(task1).pushTask(task2)

        //assert
        await Promise.allSettled([task1status.promise , task2status.promise]); //promise를 실행시키고, async 작업인 resolve 가 호출될 떄까지 대기
        assert.ok(task1completed, 'Task 1 completed')
        assert.ok(task2completed, 'Task 2 completed')
        await once(queue, 'empty') /* queue 객체가 empty 이벤트 emit 할 때까지 기다리는 promise 만듦 */
    })

    test.todo('Respect the concurrency limit' , async() => {
        const queue = new TaskQueue(4); 
        let runningTasks =0; 
        let maxRunningTasks = 0 ; 
        let completedTasks = 0; 

        const task = async() => {
            runningTasks++;
            maxRunningTasks = Math.max(runningTasks, maxRunningTasks); 
            await setImmediate(); 
            runningTasks--; 
            completedTasks++; 
            console.log(`Running tasks: ${runningTasks}, Max running tasks: ${maxRunningTasks}, Completed tasks: ${completedTasks}`)
        }

        queue
        .pushTask(task)
        .pushTask(task)
        .pushTask(task)
        .pushTask(task)
        .pushTask(task)
      await once(queue, 'empty')
  
      assert.equal(maxRunningTasks, 4)
      assert.equal(completedTasks, 5)
    })

    test('Emits "TaskError" on task failure' , async() => {
    //taskerror가 출력되는지 확인해야함. 
    //error을 발생시키는 task를 넣고 
    //catdh(err)로 나오고  queue에 "taskError" 이벤트 발생하는지 체크 
        const queue = new TaskQueue(2); 
        const errors = []; 

        queue.on('taskError' , (err) => {
            errors.push(err.message)
        })
        queue.pushTask(async () => {
            await setImmediate()
            throw new Error('Task failed 1')
        })

        queue.pushTask(async () => {
            await setImmediate()
            throw new Error('Task failed 2')
        })
        
        /* await once(empty체크) OR 비동기 await 로직은 꼭 필요함!! 
        없으면 task push 안된상태에서 assert 부터 실행되룻도 있음.  */
        await once(queue, 'empty')
        assert.equal(errors.length, 2)
        assert.equal(errors[0] , 'Task failed 1')
        assert.equal(errors[1] , 'Task failed 2')

      
    })

    test.todo('stats() returns correct counts' , async () => {
        const queue = new TaskQueue(1);
        const task = async() => {
            await setImmediate(); 
        } 

        queue.pushTask(task).pushTask(task)
        await setImmediate(); 
        assert.deepEqual(queue.stats(), {running: 1, scheduled: 1})
        await once(queue, 'empty')
        assert.deepEqual(queue.stats(), {running: 0, scheduled: 0})
        
    
    })
})