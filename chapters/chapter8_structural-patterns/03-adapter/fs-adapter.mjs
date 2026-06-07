/*
    client - 작업 요청하는 코드 (클라이언트는 타켓 인터페이스에 맞게 구현되어있음) - fs promsie
    Adaptee - 타켓인터페이스와 호환되지않는 인터페이스를 가짐. - level db
    Adapter - 클라이언트와 어댑티를 호환시켜줌. -구현할 createFSAdapter
*/

import { resolve } from 'path'; //make absolute path

export function createFSAdapter(db){
    return {
        async readFile(filename , options = undefined){ 
            /*options 을 'utf-8'로 준 경우 OR {options : 'utf-8'} 인 경우 모두 고려해야함*/
            let valueEncoding = typeof options === 'string'  ? options : options?.encoding;
            const option = valueEncoding ? {valueEncoding} : undefined; 
            const value = await db.get(resolve(filename) , option)
            if(typeof value === 'undefined'){
                const e = new Error(
                    `ENOENT: no such file or directory, open '${filename}'`
                  )
                  e.code = 'ENOENT'
                  e.errno = 34
                  e.path = filename
                  throw e
            }
            return value; 
        } , 
        async writeFile(filename , contents , options){
            let valueEncoding = typeof options === 'string'  ? options : options?.encoding;
            const option = valueEncoding ? {valueEncoding} : undefined; 
            await db.put(resolve(filename) , contents, option)
         
        }
    }
}