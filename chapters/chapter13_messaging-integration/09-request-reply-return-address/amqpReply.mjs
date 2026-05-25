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
            this.requestsQueueName, // {exclusive: true}옵션을 주면, replier의 connection종료 시(터미널에서 종료 후 재실행) 큐도 사라짐 -> 기존엔 replier 종료 후 다시 실행해도 여전히 requestor의 요청이 전달됐는데, true로 설정 후 하면 requestor 전달이 안되서 timeout err
        )
        this.queue = queue; 
        // console.log('DEBUG- queue: ', this.queue)
    }

    handleRequests(handler){
        this.channel.consume( /* amqplib은 RabbitMQ 서버에 "this.queue에 메시지가 도착하면, 나에게 알려달라"는 구독 요청을 보냅니다. 이는 일회성 요청이 아니라, 연결이 끊기기 전까지 계속 유효한 "지속적인 관심 표명"입니다. 
                                 메시지가 큐에 도착하면 RabbitMQ는 이 큐를 구독하고 있는 소비자가 있는지 확인 -> 있으므로, Rabbitmq가 메시지를 PUSH하여 밀어줌. */
            this.queue, async msg => {
                const content = JSON.parse(msg.content.toString())
                const replyData = await handler(content)
                this.channel.sendToQueue( /* sendToQueue는 사실 Default Exchange라는 특별한 Exchange를 사용하는 단축키입니다.
                                            이 Exchange는 규칙이 매우 단순합니다: "메시지의 라우팅 키(Routing Key)와 이름이 똑같은 큐(Queue)를 찾아서 직접 전달해라."*/
                    msg.properties.replyTo, // reply를 전달할 exclusive queue로 보냄. 
                    Buffer.from(JSON.stringify(replyData)), 
                    {correlationId: msg.properties.correlationId} //누구한테 보내는 답장인지 ID 명시 
                )
                this.channel.ack(msg)
    })
    }
}