import { Readable,Writable } from 'node:stream'

const nodeReadable = new Readable({
  read() {
    this.push('Hello, ')
    this.push('world!')
    this.push(null)
  },
})
const webReadable = Readable.toWeb(nodeReadable)
nodeReadable.pipe(process.stdout)
webReadable.pipeTo(Writable.toWeb(process.stdout))