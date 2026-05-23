import { nanoid } from "nanoid";
export function createRequestChannel(channel){
    const correlationMap = new Map(); 

    function sendRequest(data){
        console.log(`Sending request`, data)
        return new Promise((resolve, reject) => {
            const correlationId = nanoid()
            const replyTimeout = setTimeout(() => {
                correlationMap.delete(correlationId)
                reject(new Error(`Request timed out`))
            }, 10000)

            /* map에 id와 future cb 등록 */
            correlationMap.set(correlationId, replyData => {
                correlationMap.delete(correlationId) /* 여기서 correlationId말고 replyData.id로 사용해야된다 생각했으나, 클로져이기에 correlationId그대로가 더 적합.  */
                clearTimeout(replyTimeout)
                resolve(replyData)
            })

            /* send request to child_process */
            channel.send({
                type: 'request', 
                data, 
                id: correlationId
            })
        })
    }
    /* 자식 프로세스에서 메시지 도착 */
    channel.on('message', message => {
        const replyCb = correlationMap.get(message.inReplyTo)
        if(replyCb){
            replyCb(message.data) /* 자식프로세스에서 handler로 준, req.delay이후에 sum계산 함. 이후, process.send()로 data, inReplyTo줌.  */
        }
    })

    return sendRequest; 
}