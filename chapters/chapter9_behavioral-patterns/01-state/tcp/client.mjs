/* 
    state pattern: 
        동일한 인터페이흐에서 state 변화 ( 클래스의 메서드에 다른 클래스 인스턴스를 넣어줌 -> this.state = state 이런 식 ) -> this.state.commonMethod 로 작동. 
*/

import {hostname} from 'node:os'
import { FailsafeSocket } from './failsafeSocket.mjs'

const clientId = `${hostname()}@${process.pid}`
console.log('starting client' , clientId)
const failsafeSocket = new FailsafeSocket({port: 4545})

setInterval(() => {
    const messageDate = Buffer.from(
        JSON.stringify({
            ts : Date.now() , 
            client : clientId , 
            mem : process.memoryUsage() ,
        }) ,
        'utf-8'
    )

    const messageLength = Buffer.alloc(4) /*. network prefix */
    messageLength.writeUInt32BE(messageDate.length , 0)
    const message = Buffer.concat([messageLength , messageDate])
    failsafeSocket.send(message)

    } , 5000)
