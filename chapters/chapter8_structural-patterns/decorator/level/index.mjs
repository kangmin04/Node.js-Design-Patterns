import { join } from 'node:path'
import { Level } from 'level' 
import { levelSubscribe } from './level-subscribe.mjs'

const dbPath = join(import.meta.dirname, 'db')
const db = new Level(dbPath, { valueEncoding: 'json' })
levelSubscribe(db) //return subscribe method 포함된 db 리턴

db.subscribe(
    {doctype : 'message' , language : 'en' } , 
    (_key , value) => console.log(value)
)

await db.put('1', { 
    doctype: 'message',
    text: 'Hi',
    language: 'en',
  })
  await db.put('2', {
    doctype: 'company',
    name: 'ACME Co.',
  })