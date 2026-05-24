import { nanoid } from "nanoid";
import amqp from 'amqplib'
export class AmqpRequest{
    constructor(){
        this.correlationMap = new Map(); 
    }

    async initialize(){
        this.connection = await amqp.connect('amqp://localhost')
        this.channel = await this.connection.createChannel()
        const {queue} = await this.channel.assertQueue(
            '', 
            {exclusive: true}
        )
        this.replyQueue = queue
        // console.log('[debug] replyQueue: ', this.replyQueue)
        this.channel.consume(
            this.replyQueue, 
            msg => {
                
                const correlationId = msg.properties.correlationId
                const handler = this.correlationMap.get(correlationId)
                // console.log('debug: consume 실행됨. ')
                // console.log('correlationId: ', correlationId)
                if(handler){
                    handler(JSON.parse(msg.content.toString()))
            }
        }, {noAck: true}
        )
    }

    send(queue, message){  // send(requests_queue, {a,b})
        return new Promise((resolve, reject) => {
            const id = nanoid()
            const replyTimeout = setTimeout(() => {
                this.correlationMap.delete(id)
                reject(new Error(`Request timed out`))
            }, 10000)
            
            this.correlationMap.set(id, replyData => {
                this.correlationMap.delete(id)
                clearTimeout(replyTimeout)
                resolve(replyData)
            })
            console.log('[DEDUB] MAP: ', this.correlationMap)

            this.channel.sendToQueue(
                queue, // requests_queue
                Buffer.from(JSON.stringify(message)), /* AMQP는 바이트를 전송하는 프로토콜. 직렬화된 문자열을 다시 Buffer 객체로 반환하여 바이너리데이터로 만들어 보내야함.  */
                { /* 메타데이터 */
                    correlationId: id, 
                    replyTo: this.replyQueue /* requests_queue는 모두가 사용하는 공용 queue, 여기로 보낸다면 누구의 요청인지 식별 불가. -> replyTo로 개인 큐로 보냄.  */
                }
            )
        })
    }

    destory(){
        this.channel.close(); 
        this.connection.close(); 
    }
}