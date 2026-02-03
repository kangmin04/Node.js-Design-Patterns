/*
    Create a Queue class that has only one publicly accessible method called dequeue(). 
    Such a method returns a Promise that resolves with a new element extracted from an internal queue data structure. 
    If the queue is empty, then the Promise will resolve when a new item is added. 
    The Queue class must also have a revealing constructor that provides a function called enqueue() to the executor 
    that pushes a new element to the end of the internal queue. The enqueue() function can be invoked asynchronously, 
    and it must also take care of “unblocking” any eventual Promise returned by the dequeue() method. 
    To try out the Queue class, you could build a small HTTP server into the executor function. 
    Such a server would receive messages or tasks from a client and would push them into the queue. 
    A loop would then consume all those messages using the dequeue() method.
*/

/*
    Queue외부에선 dequeue만 보여야함,. 
    revealing constructor로 생산자 , 소비자 역할 분리함. 
    생산자 : http 서버. -> executor 인자에 (enqueue) => {} 형태로 body.data 가져와서 enqueue로 queue에 넣음. 
    소비자 : public 한 dequeue만 가져와서 큐에서 데이터 꺼냄. 
    --> enqueue는 생성시점에만보이며 이후엔 감춰진다. 
*/

import http from 'node:http'; 

class Queue {
    constructor(executor){
        this.queue = ['미리 넣어둔 데이터' , 'chunkeddata' , 'test']; 
        this.pendingResolvers = []; 

        const enqueue = (item) => {
            if(this.pendingResolvers.length > 0){
                console.log('in enqueue.. before shirt resolver ; ' , this.pendingResolvers)
                const resolve = this.pendingResolvers.shift(); 
                resolve(item); // 애초에 resolve만 넣음 . 
            }else{
                this.queue.push(item); 
            }
        }
        executor(enqueue)
    }
    dequeue(){
        //i thought in empty case, i just do return pending promise but struggle w how to handle that promise into resolve... 
        //BUT just push resolve !
        //and whenever u want to use resolve , just shift it and use that item and resolve. 
        return new Promise((resolve , reject) => {
            if(this.queue.length === 0){
                this.pendingResolvers.push(resolve); 
            }else{
                resolve(this.queue.shift())
            }
        })
    }
    
}

const queueInstance = new Queue((enqueue) => {
    const server = http.createServer((req,res) => {
        if(req.method === 'POST' && req.url ==='/message'){
            let body = '';
            req.on('data' , (data) => {
                body += data.toString();
            })

            req.on('end' , () => {
                console.log(`[Producer]: Enqueueing "${body}"`);
                enqueue(body);
                res.writeHead(200, { 'Content-Type': 'application/json' }) //text/plain도 가능... 
                res.end(JSON.stringify({ message: 'Message enqueued' }))
            })
        }else{
            res.writeHead(404); 
            res.end('NOT Found'); 
        }
    })

    server.listen(3000 , () => {
        console.log('Server running on http://localhost:3000')
        console.log('Send a POST request to /message to enqueue a task.')
        console.log('Example: curl -X POST -d "hello world" http://localhost:3000/message')
    })
})


async function consume () {
    console.log('[Consumer]: Waiting for messages...')
    while (true) {
      const message = await queueInstance.dequeue()
      console.log(`[Consumer]: Dequeued "${message}"`)
      // Here you would do some work with the message
    }
}

consume()
.then(() => {console.log('first item dequeued. ')})
.catch(console.error)

