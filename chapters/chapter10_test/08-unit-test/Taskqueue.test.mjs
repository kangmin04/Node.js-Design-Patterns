import assert from 'node:assert/strict'
import {once} from 'node:events'
import {suite, test} from 'node:test'
import { setImmediate } from 'node:timers/promises'
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
            task1status.resolve(); 
        }

        queue.pushTask(task1).pushTask(task2)

        await Promise.allSettled([task1status.promise , task2status.promise]); //promise를 실행시키고, async 작업인 resolve 가 호출될 떄까지 대기
        assert.ok(task1completed, 'Task 1 completed')
        assert.ok(task2completed, 'Task 2 completed')
        await once(queue, 'empty')
    })
})