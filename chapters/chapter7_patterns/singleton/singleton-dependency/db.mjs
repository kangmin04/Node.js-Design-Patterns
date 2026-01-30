import {join} from 'node:path'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

export const db = await open({
    filename : join(import.meta.dirname , 'data.sqlite') , 
    driver : sqlite3.Database ,
})