export class OnlineState {
    constructor(failsafeSocket) {
      this.failsafeSocket = failsafeSocket
    }

    send(data){
        this.failsafeSocket.queue.push(data); 
        this._tryFlush(); 
    }

    async _tryFlush(){
        try{
            let success = true 
            while(this.failsafeSocket.queue.length > 0){
                const data = this.failsafeSocket.queue[0] //peak
                const flushed = await this._tryWrite(data); 
                if(flushed){
                    this.failsafeSocket.queue.shift(); 
                }else{
                    success = false; 
                    break; 
                }
        }

        if(!success){
            console.log('Flushing failed -> going offline')
            this.failsafeSocket.changeState('offline')
        }
    }catch(err){
        console.error('Error during flush', err.message)
        console.log('Flushing failed -> going offline')
        this.failsafeSocket.changeState('offline')
    }
}
    _tryWrite(data){
        return new Promise((resolve) => {
            this.failsafeSocket.socket.write(data, (err) => {
                if(err){
                    resolve(false)
                }
                resolve(true)
            })
        })
    }

    
    activate() { // 4
        this._tryFlush()
      }
}