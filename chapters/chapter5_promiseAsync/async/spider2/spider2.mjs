import { readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  exists,
  get,
  getPageLinks,
  recursiveMkdir,
  urlToFilename,
} from './utils.js'

async function saveFile(filename, content) {
  await recursiveMkdir(dirname(filename))
  
  await writeFile(filename, content)
}

async function download(url, filename) {
  console.log(`Downloading ${url} into ${filename}`)
  const content = await get(url)
  await saveFile(filename, content)
  return content; 
}

async function spiderLinks(currentUrl, body, maxDepth) {
  if (maxDepth === 0) {
    return ; 
  }

  const links = getPageLinks(currentUrl, body)
  for (const link of links) {
   await spider(link, maxDepth -1 )
  }
}

export async function spider(url, maxDepth) {
  const filename = urlToFilename(url)
  let content ; 
  if(!(await exists(filename))){  
    content = await download(url,filename)
  } //file content must contain... 

  if(!filename.endsWith('.html')){
    return 
  }
  if(!content){ //download 중복 제거. 
    content = await readFile(filename,'utf8')
  }
  await spiderLinks(url,content.toString('utf8'),maxDepth)
}