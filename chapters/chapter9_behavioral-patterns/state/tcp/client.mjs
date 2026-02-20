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

    const messageLength = Buffer.alloc(4)
    messageLength.writeUInt32BE(messageDate.length , 0)
    const message = Buffer.concat([messageLength , messageDate])
    failsafeSocket.send(message)

    } , 5000)
