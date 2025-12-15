import { readFile, writeFile } from 'node:fs'
import { dirname } from 'node:path'
import {
  exists,
  get,
  getPageLinks,
  recursiveMkdir,
  urlToFilename,
} from './utils.js'

function saveFile(filename, content, cb) {
  recursiveMkdir(dirname(filename), err => {
    if (err) {
      return cb(err)
    }
    writeFile(filename, content, cb)
  })
}

function download(url, filename, cb) {
  console.log(`Downloading ${url} into ${filename}`)
  get(url, (err, content) => {
    if (err) {
      return cb(err)
    }
    saveFile(filename, content, err => {
      if (err) {
        return cb(err)
      }
      cb(null, content)
    })
  })
}

function spiderLinks(currentUrl, body, maxDepth, queue) {
  if (maxDepth === 0) {
    return
  }

  const links = getPageLinks(currentUrl, body)
  if (links.length === 0) {
    return
  }

  for (const link of links) {
    spider(link, maxDepth - 1, queue) //각 link들에 지체없이 바로 spider 호출 -> queue.pushTask 바로 실행
    //해당 링크를 크롤링하는 새로운 spiderTask를 태스크 큐에 추가 
  }
}

function spiderTask(url, maxDepth, queue, cb) {
  const filename = urlToFilename(url)

  exists(filename, (err, alreadyExists) => {
    if (err) {
      return cb(err)
    }

    if (alreadyExists) {
      if (!filename.endsWith('.html')) {
        // ignoring non-HTML resources
        return cb()
      }

      return readFile(filename, 'utf8', (err, fileContent) => {
        if (err) {
          // error reading the file
          return cb(err)
        }
        spiderLinks(url, fileContent, maxDepth, queue)
        return cb()
      })
    }
    // The file does not exist, download it
    download(url, filename, (err, fileContent) => {
      if (err) {
        // error downloading the file
        return cb(err)
      }
      // if the file is an HTML file, spider it
      if (filename.endsWith('.html')) {
        spiderLinks(url, fileContent.toString('utf8'), maxDepth, queue)
        return cb() //다운로드나 비동기 작업 끝났을 떄 done() 호출 ! 
        // done()은 TaskQueue에서 정의한 
        // : (err => { 
        //   if (err) {
        //     this.emit('error', err)
        //   }
        //   this.running--   -> 실행 중 작업이 종료된 것이므로 카운트 1 줄임.
        //   process.nextTick(this.next.bind(this))   => 작업이 하나 끝났으니 , 혹시 큐에 작업 있는지 체크해라. 
        // })
        // this.running++
      }
      // otherwise, stop here
      return cb()
    })
  })
}

const spidering = new Set() //prevent race conditions. 

export function spider(url, maxDepth, queue) {
  if (spidering.has(url)) {
    return
  }
  spidering.add(url)

  queue.pushTask(done => {
    spiderTask(url, maxDepth, queue, done)
  })
}