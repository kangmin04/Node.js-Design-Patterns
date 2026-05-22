import { createReplyChannel } from "./createReplyChannel.mjs";
const registerReplyHandler = createReplyChannel(process);

registerReplyHandler(req => {
    return new Promise( resolve => {
        setTimeout(() => {
            resolve({sum: req.a + req.b})
        }, req.delay)
    })
})

process.send('ready') /* ? 실제 연결된건지 하는건가? 근데 꼭 해야함?  */