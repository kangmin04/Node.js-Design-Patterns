import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream'
import { randomBytes } from 'node:crypto'
import { createDecryptAndDecompress } from './combined-stream-crypto.mjs'

const [, , password, ivHex, source, destination] = process.argv
const iv = Buffer.from(ivHex, 'hex')

pipeline(
  createReadStream(source),
  createDecryptAndDecompress(password, iv),
  createWriteStream(destination),
  err => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log(`${destination} created`)
  }
)