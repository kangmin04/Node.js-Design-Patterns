import {setTimeout} from 'node:timers/promises'; 

class Database {
    connected = false; 
    #pendingConnection = null; 
    commandsQueue = []; 
    
    async connect(){
        if(!this.connected){
            if(this.#pendingConnection){
                return this.#pendingConnection; 
            }

            this.#pendingConnection = setTimeout(500); 
            await this.#pendingConnection; 
            this.connected = true; 
            this.#pendingConnection = null; 
            
            while(this.commandsQueue.length > 0){
                const command = this.commandsQueue.shift(); 
                    command(); 
              
            }
        }             
    }

    async query(queryString){
        if(!this.connected){
            console.log(`Requested queueString: ${queryString}`)
            return new Promise((resolve, reject) => {
                const command = () => {
                    this.query(queryString).then(resolve, reject)
                }
                this.commandsQueue.push(command); 
            })
        }
        await setTimeout(100); 
        console.log(`Query executed: ${queryString}`)
    }
}

export const db = new Database()

/*
    - async함수는 무조건 프로미스 반환. 
    - async 함수 내에서 return 키워드로 값을 반환하면 -> async 함수가 반환한 프로미스는 그 값으로 resolve 됨. 
    - async 함수 내에서 throw로 에러 던지면 -> async 함수가 반환한 Promise는 그 에러로 reject됨
    - async 함수가 return 없이 끝까지 실행되면 그 프로미스는 undefined 값으로 resolve됨

    async function giveMeFive() {
        return 5;
    }

    // 위 함수는 아래와 거의 동일합니다.
    function giveMeFiveTheOldWay() {
        return Promise.resolve(5);
    }


    ------------------

     return new Promise((resolve, reject) => {
                const command = () => {
                    this.query(queryString).then(resolve, reject)
                }
                this.commandsQueue.push(command); 
        })
    여기서 this.query().then(resolve, reject)는 사실 
    // 우리가 더 익숙한 긴 버전의 코드
    this.query(queryString).then(
    (result) => {
        // this.query가 성공하면, 그 성공 결과(result)를 가지고
        // 바깥 프로미스의 resolve 함수를 호출해준다.
        resolve(result);
    },
    (error) => {
        // this.query가 실패하면, 그 실패 원인(error)을 가지고
        // 바깥 프로미스의 reject 함수를 호출해준다.
        reject(error);
    }
    );
*/