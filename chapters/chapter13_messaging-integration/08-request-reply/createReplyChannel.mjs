export function createReplyChannel(channel){ //process
    return function registerHandler(handler){
        channel.on('message', async message => {
            if(message.type !== 'request'){
                return
            }
            const replyData = await handler(message.data)
            channel.send({
                type: 'response', 
                data: replyData, 
                inReplyTo: message.id /* 누구한테 보내는 답장인지 correlationId로 식별 */
            })
        })
    }
}