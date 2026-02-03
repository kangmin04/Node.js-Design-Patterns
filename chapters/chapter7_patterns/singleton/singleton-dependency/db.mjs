import {join} from 'node:path'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

/*
    db instance를 export하여 전체 프로그램에서 해당 인스턴스만을 사용하도록함, -> 싱글톤
*/
export const db = await open({
    filename : join(import.meta.dirname , 'data.sqlite') , 
    driver : sqlite3.Database ,
})