/*
    다음 예제 실습 시, 
    history-service queue에 arguements 추가되었기에,  
    docker exec my-rabbitmq rabbitmqctl delete_queue chat-history로 queue 지운 후 새로 생성하여 사용! 
    chat4에서 msg할때 history-service로 queue를 만들었으나 둘이 세팅이 다름! 


*/


import { createServer } from "node:http";
import { Level } from "level";
import { monotonicFactory } from "ulid";
import amqp from 'amqplib'

const ulid = monotonicFactory(); 
const db = new Level('msgHistory', {valueEncoding: 'json'})
const connection = await amqp.connect('amqp://localhost') 
const channel = await connection.createChannel(); 


/* Dead Letter Exchange */
await channel.assertExchange('dlx', 'fanout')
const {queue:queueDLX} = await channel.assertQueue('dlq', {durable: true})
await channel.bindQueue(queueDLX, 'dlx')


await channel.assertExchange('chat', 'fanout') /* 외부 rabbitMQ 프로세스에, chat이란 이름의 fanout 방식의 exchange가 존재하는지 확인. 없으면 만들고, 존재하면 넘어감. -> assert인 이유 */
const {queue} = await channel.assertQueue('chat-history', {
    durable: true, 
    arguments: {
        'x-dead-letter-exchange': 'dlx'
    }
}) 
await channel.bindQueue(queue,'chat') 


channel.consume(queue, async (msg) => {
    try{
        const data = JSON.parse(msg.content.toString())
        // console.log(data)
        console.log(`Saving messages: ${msg.content}`)
        if(data.text=== 'error') throw new Error('intended errorMessage.')
        await db.put(ulid(), data); 
        channel.ack(msg) 
    }catch(err){
        console.error(`Failed to process messages`,)
        channel.nack(msg, false, false)
    }
})

/* 일단 TEST용. dlx에 데이터 존재하면 -> 출력해보기 */
/* production level에선 
    1. dlq에 메시지 쌓이면 슬랙이나 이메일로 알림받고, 메시지 확인하여 분석 후 버그 수정하여 재배포 
    2. 외부 API가 일시적 다운이면, 복구 기다리다가 복구 시 DLQ의 메시지들을 원래 큐로 옮겨서 재시도. */
channel.consume(queueDLX, msg => {
    console.log(`DLX message: ${msg}`)
    // RabbitMQ가 추가해준 '사망 원인' 헤더 정보 출력
    console.log("Headers:", msg.properties.headers); 

    channel.ack(msg) /* 실패한 메시지 로그남기고, 처리했으니 ack()호출해서 지워줘야함! 안지우면 계속 history-service queue에 남아있음.  */
})

createServer(async (req,res) => {
    //fetch로 chat 과거 데이터 요청 시 
    const url = new URL(req.url, `http:localhost`)
    const lt = url.searchParams.get('lt'); 
    res.writeHead(200, {'Content-Type': 'application/json'})
    const messages = []; 
    for await (const [key, values] of db.iterator({ /* 시간순으로 key에 ulid 저장 -> 대화 기록들이 시간순으로 기록됨. 측, 가장 최근거는 가장 끝이기에, 역순으로 10개를 뽑아서 가장 최근걸 가져옴.  */
        reverse: true, 
        limit: 10, 
        lt
    })){
        messages.unshift({id: key, ...values}) /* 출력순서는 다시 가장 최근게 가장 마지막에 가야하기에, unshift로 가장 앞에 data appending 해줌 */
    }

    res.end(JSON.stringify(messages, null, 2))
}).listen(8090, () => console.log(`chat history-service is running on http://localhost:8090`))