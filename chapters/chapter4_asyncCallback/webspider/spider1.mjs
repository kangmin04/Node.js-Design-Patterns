import {writeFile} from 'node:fs' 
import { dirname } from 'node:path'
import { exists, get, recursiveMkdir, urlToFilename } from './utils.js'


export function spider(url, cb) {
    const filename = urlToFilename(url)
    exists(filename, (err, alreadyExists) => { // 1
      if (err) { // 1.1
        cb(err)
      } else if (alreadyExists) { // 1.2
        cb(null, filename, false)
      } else { // 1.3
        console.log(`Downloading ${url} into ${filename}`)
        get(url, (err, content) => { // 2
          if (err) {
            cb(err)
          } else {
            recursiveMkdir(dirname(filename), err => { // 3
              if (err) {
                cb(err)
              } else {
                writeFile(filename, content, err => { // 4
                  if (err) {
                    cb(err)
                  } else {
                    cb(null, filename, true) // 5
                  }
                })
              }
            })
          }
        })
      }
    })
  }