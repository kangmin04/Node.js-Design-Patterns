
import {setTimeout} from 'node:timers/promises'; 

class Database {
    connected = false; 
    #pendingConnection = null; 

    async connect(){
        if(!this.connected){
            if(this.#pendingConnection){
                return this.#pendingConnection; 
            }

            this.#pendingConnection = setTimeout(500); 
            await this.#pendingConnection; 
            this.connect = true; 
            this.#pendingConnection = null; 
        }             
    }

    async query(queryString){
        if(!this.connect){
            throw new Error('Not connected yet')
        }
        await setTimeout(100); 
        console.log(`Query executed: ${queryString}`)
    }
}

export const db = new Database()