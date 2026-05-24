import { amqpReply } from "./amqpReply.mjs";
const reply = new amqpReply('request_queue'); 
await reply.initialize(); 
reply.handleRequests(req => {
    console.log('Request received', req)
    return {sum: req.a + req.b}
})
