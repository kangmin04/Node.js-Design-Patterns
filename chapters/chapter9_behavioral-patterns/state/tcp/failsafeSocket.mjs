import { OfflineState } from "./offlineState.mjs";
import { OnlineState } from "./onlineState.mjs";

export class FailsafeSocket {
    constructor(options){
        this.options = options ; 
        this.queue = []; 
        this.currentState = null;
        this.socket = null;
        this.states = {
            //failsafesocket의 인스턴스를 직접 전달하면서 constructor의 queue를 offline에서도 사용가능하게함
            offline : new OfflineState(this) , 
            online : new OnlineState(this)
        }

        this.changeState('offline') 
        /* 처음에 offline active호출해서 this.failsafeSocket.socket에 tcp connection 연결 */
    }

    changeState(state){
        console.log(`Activating state: ${state}`)
        this.currentState = this.states[state]
        this.currentState.activate()
    }
    send(data){
        this.currentState.send(data); 
    }
}