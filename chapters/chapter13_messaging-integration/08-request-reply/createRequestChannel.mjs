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
                correlationMap.delete(correlationId)
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
        
    })

    return sendRequest; 
}