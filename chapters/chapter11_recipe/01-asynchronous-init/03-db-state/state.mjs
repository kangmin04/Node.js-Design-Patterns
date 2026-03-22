/*
    state pattern: 
    하나의 공통된 메서드로 각기 다른 state의 메서드를 수행가능. (각 state는 조건에 맞춰 switch )

*/
import { setTimeout } from "node:timers/promises"
class stub {
    async query(queryString){
        console.log('Stub code. You have to implement this method')
    }
}
export class InitializedState extends stub{
    constructor(db){
        super() // 파생 클래스에서 this 접근하려면 super 해줘야함. 
        this.db = db
    }
    async query(queryString){
        await setTimeout(100)
        console.log('Query executed:' , queryString)
    }
}

const deactivate = Symbol('deactivate'); 

export class QueuingState extends stub {
    constructor(db){
        super()
        this.db = db
        this.commandsQueue = []; 
    }

    async query(queryString){ //연결전이기에 무조건 query 시 전부 queue로 push
        console.log(`Requested queueString: ${queryString}`)
        return new Promise((resolve, reject) => {
            const command = () => {
                this.db.query(queryString).then(resolve, reject)
            }
            this.commandsQueue.push(command); 
           })
    }

    [deactivate](){ // 단순 deactivate가 아닌, 심볼값. 즉 고유한 값을 키로 메서드 정의를 하고싶을 때 !! 
        while(this.commandsQueue.length > 0){
            const command = this.commandsQueue.shift(); 
                command(); 
          /* command 실행하면 this.db.query가 날라감. 이때 await이 없기에, query가 프로미스 반환하고 즉시 종료됨. 
          즉 command는 단순 trigger임. 이후 처리는 queue에 넣던 시점에 resolve를 이미 콜백으로 넣어뒀기에 외부 resolve가 호출됨~  */
    }
}
}

class Database {
    connected = false; 
    #pendingConnection = null; 
    constructor(){
        this.state = new QueuingState(this) //connected 전까지의 state
    }
    
    async connect(){
        if(!this.connected){
            if(this.#pendingConnection){
                return this.#pendingConnection; 
            }

            this.#pendingConnection = setTimeout(500); 
            await this.#pendingConnection; 

            this.connected = true; 
            this.#pendingConnection = null; 
            const oldState = this.state;
            this.state = new InitializedState(this); 
            oldState[deactivate]?.()
        }             
    }

    async query(queryString){
       return this.state.query(queryString)
    }
}

export const db = new Database()

