/*
    1. request 인스턴스 생성. -- AmqpRequest 클래스로. 
    2. request.initiaalize() -- request queue를 만들거나,,, 혹은 exclusive 한 queue를 만들고, 이 큐는 추후 replier의 return address로 사용. 즉, replier에 exclusive queue를 전달해주고 replier에서 응답 보내야할 때 consume(exclusiveQueue등으로 해줌)
    3.  실제 request 로직. 
*/

import { AmqpRequest } from "./amqpRequest.mjs";
import { setTimeout } from "node:timers/promises";
const request = new AmqpRequest(); 
await request.initialize(); 

async function sendRandomRequest() {
    const a = Math.round(Math.random() * 100)
    const b = Math.round(Math.random() * 100)
    // console.log('[debug] a, b: ', a, b)
    const reply = await request.send('requests_queue', { a, b })
    console.log('debug] after reply') // this doesnt work ....... 
    console.log(`${a} + ${b} = ${reply.sum}`)
  }
  
for (let i = 0; i < 20; i++) {
    console.log('Sending request...', i)
    await sendRandomRequest()
    await setTimeout(1000)
}
  
request.destory();