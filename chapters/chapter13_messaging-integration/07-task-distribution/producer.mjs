import zmq from 'zeromq'
import { generateTasks } from './generateTasks.mjs'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
const BATCH_SIZE = 10000

const [, , maxLength, searchHash] = process.argv
const ventilator = new zmq.Push(); 
await ventilator.bind('tcp://*:5016') /* PULL socket이 connecte 할 주소 */
const generatorObj = generateTasks(searchHash, ALPHABET, maxLength, BATCH_SIZE)
for(const task of generatorObj){
    await ventilator.send(task) /* 각 작업을 worker에게 보냄. round-robin 방식으로 다른 작업 받음 */ 
}