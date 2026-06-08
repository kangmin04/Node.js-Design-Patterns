import { createConnection } from 'node:net'

export class OfflineState {
    constructor(failsafeSocketInstance){
        this.failsafeSocket = failsafeSocketInstance; 
    }
    /* offline 상태이기에 queue에 넣어두고, online state 시 queue에 있던걸 그제야 send!  */
    send(data){
        this.failsafeSocket.queue.push(data); 
    }

    activate(){
        const retry = () => {
            setTimeout(() => this.activate() , 1000)
        }

        console.log(
            `Trying to connect (${this.failsafeSocket.queue.length} queued `+
              `messages)`
        )
        
        this.failsafeSocket.socket = createConnection(
            this.failsafeSocket.options , () => {
                console.log('Connection established')
                this.failsafeSocket.socket.removeListener('error', retry)
                this.failsafeSocket.changeState('online')
            }
        )
        /* */
        this.failsafeSocket.socket.once('error', retry)
    
    }
}