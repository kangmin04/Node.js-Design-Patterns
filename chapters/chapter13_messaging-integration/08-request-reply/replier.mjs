import { createReplyChannel } from "./createReplyChannel.mjs";
const registerReplyHandler = createReplyChannel(process);

registerReplyHandler(req => {
    return new Promise( resolve => {
        setTimeout(() => {
            resolve({sum: req.a + req.b})
        }, req.delay)
    })
})

process.send('ready') /* 부모 프로세스에게 요청받을 준비됨을 알려주는 신호. 
    만약 없다면, fork로 자식 프로세스 실행 후, 부모 프로세스가 바로 request를 날릴것임. 이때 자식은 막 실행되어, channel.on('message', )로 받을 준비를 함. 
    이때 바로 날린 request는 message 이벤트 등록전에 실행된거라면 해당 요청이 누락될 것! 
    --> await once(channel, 'message')로 requestor에서 reply준비된 후에야 실제 요청을 보내는 것! 
    이는 모든 비동기 프로세스의 핵심이다. 
*/