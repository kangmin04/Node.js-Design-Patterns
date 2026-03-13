import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

export class DbClient{
    #dbPath
    #db

    constructor(dbPath){
        this.#dbPath = dbPath; 
        this.#db = null; 
    }

    async #connect(){
        if(this.#db){
            return this.#db; 
        }

        this.#db = await open({
            filename: this.#dbPath,
            driver: sqlite3.Database,
        })

        return this.#db; 
    }

    async query(sql, params ={}){
        const db = await this.#connect(); 
        return db.all(sql, params)
    }

    async close(){
        if(this.#db){ //뭘 하든 있는지 없는지 유무를 체크하도록 하자. 
            await this.#db.close(); 
            this.#db = null; 
        }
    }
}