/*
    `2 strategy
    1. tcp socket is available
    
    2. disconnected  - 
    inteface write method
*/

import * as net from 'node:net'
class tcp{ //abstract class OR interface
    write(){
        console.log('basic tcp write');
    }
}
//strategy OR state
class tcpAvailable extends tcp{
    constructor(tcpSocket){
        this.tcpSocket = tcpSocket
    }
    write(data){
        this.tcpSocket.write(data) // actual tcp write
        /* 바로 write 하는 거보단 , queue에 push하고 flushAll()을 호출해서 전체 queue를 socket.write 시도하는 방향으로 ...  */
    }
}

class tcpUnavailable extends tcp{
    constructor(queue){
        this.queue = queue; 
    }
    write(data){
        this.queue.push(data); 
    }
}
net.createServer()
const tcpAvailableInstance = new tcpAvailable();
const tcpUnavailableInstance = new tcpUnavailable();    