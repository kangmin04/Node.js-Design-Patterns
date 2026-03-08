import assert from 'node:assert/strict'
import {once} from 'node:events'
import {suite, test, mock} from 'node:test'
import { scheduler, setImmediate } from 'node:timers/promises'
import { TaskQueue } from './Taskqueue.mjs'

  test.todo('All tasks are executed and empty is emitted' , async () => {
        const queue = new TaskQueue(2); 
        const task1 = mock.fn(async () => {
            await setImmediate(); 
            // task1completed = true; 
            // task1status.resolve(); 
        })

        const task2 = mock.fn(async () => {
            await setImmediate(); 
        })

        queue.pushTask(task1).pushTask(task2)
        await once(queue, 'empty') 
        assert.equal(task1.mock.callCount() , 1)
        assert.equal(task2.mock.callCount() , 1)
      
    })