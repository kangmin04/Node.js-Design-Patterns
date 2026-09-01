import { fork } from 'node:child_process'
import { once } from 'node:events'
import { join } from 'node:path'
import { createRequestChannel } from './createRequestChannel.mjs'

const channel = fork(join(import.meta.dirname, 'replier.mjs')) /* replier.mjs 실행하는 자식 프로세스 생성. Childprocess를 리턴하고, spawn과는 다르게 fork는 process와 childprocess 통신가능한 channel 기능 제공함 */
const request = createRequestChannel(channel) /* 자식프로세스 넘겨줌 */
try{
    const [message] = await once(channel, 'message') // print: ['ready', undefineded]
    console.log('Child process initialized', message)
    const p1 = request({a: 1, b: 2, delay: 900}).then(res => console.log(`Reply: 1 + 2 = ${res.sum}`))
    const p2 = request({a: 6, b: 1, delay: 100}).then(res => console.log(`Reply: 6 + 1 = ${res.sum}`))
    await Promise.all([p1, p2])
}catch(err){
    // 에러는 무시 - 자식 프로세스 정리는 finally에서 처리
}finally{
    channel.disconnect() /* make child-process to exit gracefully */
}