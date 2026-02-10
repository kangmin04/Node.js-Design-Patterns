import { createFSAdapter } from "./fs-adapter.mjs";
import { Level } from "level";
import {join} from 'node:path'

const db = new Level(join(import.meta.dirname, 'db'), {
    valueEncoding: 'binary',
  })

const fs = createFSAdapter(db); 

await fs.writeFile('file.txt', 'Hello!_adapter', {encoding : 'utf8'})
const res = await fs.readFile('file.txt', 'utf8')
console.log(res)
// try to read a missing file (throws an error)
await fs.readFile('missing.txt')