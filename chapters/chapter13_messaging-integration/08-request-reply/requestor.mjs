import { fork } from 'node:child_process'
import { once } from 'node:events'
import { join } from 'node:path'
import { createRequestChannel } from './createRequestChannel.mjs'

const channel = fork(join(import.meta.dirname, 'replier.mjs'))
const request = createRequestChannel(channel) /* 자식프로세스 넘겨줌 */
try{
    const [message] = await once(channel, 'message')
    const p1 = request({a: 1, b: 2, delay: 500}).then(res => console.log(`Reply: 1 + 2 = ${res.sum}`))
    const p2 = request({a: 6, b: 1, delay: 100}).then(res => console.log(`Reply: 6 + 1 = ${res.sum}`))
    await Promise.all([p1, p2])
}catch(err){

}finally{
    channel.disconnect()
}