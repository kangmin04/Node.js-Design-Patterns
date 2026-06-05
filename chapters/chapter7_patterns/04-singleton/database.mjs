export class Database {
    constructor (dbName, connectionDetails) {
      // ...
    }
    // ...
  }

// dbInstance.js
import { Database } from './database.mjs'
export const dbInstance = new Database('my-app-db', {
    url: 'localhost:5432',
    username: 'user',
    password: 'password'
})