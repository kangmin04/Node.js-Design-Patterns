import { readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  exists,
  get,
  getPageLinks,
  recursiveMkdir,
  urlToFilename,
} from './utils.js'

function saveFile(filename, content) {
  return recursiveMkdir(dirname(filename))
  .then(() => writeFile(filename, content))
  .then(() => content)  
  
}

function download(url, filename) {
  console.log(`Downloading ${url} into ${filename}`)
  return get(url).then(content =>saveFile(filename, content ))
}
const spidering = new Set()

function spiderLinks(currentUrl, body, maxDepth, queue) {
  if (maxDepth === 0) {
    return
  }
  const links = getPageLinks(currentUrl, body)
  if (links.length === 0) {
    return
  }

  for (const link of links) {
    if(!spidering.has(link)){
      queue.pushTask(() => spider(link , maxDepth - 1, queue)); 
      spidering.add(link); 
    }
  }
}


export function spider(url, maxDepth, queue) {
  const filename = urlToFilename(url)

  return exists(filename).then(alreadyExists => {
    if (alreadyExists) {
      if (!filename.endsWith('.html')) {
        return
      }

      return readFile(filename, 'utf8').then(fileContent =>
        spiderLinks(url, fileContent, maxDepth, queue)
      )
    }
    return download(url, filename).then(fileContent => {
      if (filename.endsWith('.html')) {
        return spiderLinks(url, fileContent.toString('utf8'), maxDepth, queue)
      }
      // otherwise, stop here
      return
    })
  })
}