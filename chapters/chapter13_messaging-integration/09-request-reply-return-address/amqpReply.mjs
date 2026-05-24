import amqp from 'amqplib'
export class amqpReply{
    constructor(queueName){
        this.requestsQueueName = queueName; // replier에서 requests_queue // 그냥 queue_set이란 메서드로 더 가독성 좋게 했을듯? 
    }
    /* 중간의 request_queue 만들기 */ 
    // 내 생각엔 request에서 이미 본인주소를 담은 return queue를 만드니,
    // reply에서 하나의 queue를 만든거같은데.. 
    // 그럼 왜 하나의 channel당 하나의 queue 규칙이 생긴거지? 
    async initialize(){
        this.connection = await amqp.connect('amqp://localhost')
        this.channel = await this.connection.createChannel()
        const {queue} = await this.channel.assertQueue(
            this.requestsQueueName
        )
        this.queue = queue; 
        // console.log('DEBUG- queue: ', this.queue)
    }

    handleRequests(handler){
        this.channel.consume(
            this.queue, async msg => {
                const content = JSON.parse(msg.content.toString())
                const replyData = await handler(content)
                this.channel.sendToQueue(
                    msg.properties.replyTo, // reply를 전달할 exclusive queue로 보냄. 
                    Buffer.from(JSON.stringify(replyData)), 
                    {correlationId: msg.properties.correlationId} //누구한테 보내는 답장인지 ID 명시 
                )
                this.channel.ack(msg)
    })
    }
}