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
  return get(url).then(content => saveFile(filename, content))
}

function spiderLinks(currentUrl, body, maxDepth) {
  if (maxDepth === 0) {
    return Promise.resolve()
    //spiderLinks에선 항상 프로미스를 반환. 따라서 재귀 종료를 나타내고자 빈 프로미스(완료된)걸 반환
    //그냥 return ; 일 경우, Promise.all이 undefined를받아서 종료됨 .
  }

  const links = getPageLinks(currentUrl, body) ; 

  const promises = links.map(link => spider(link, maxDepth - 1)); 
  //spider은 작업을 기다리는 동기함수가 아님. spider() 호출 즉시, 프로미스 객체를 반환하고 , 실제 비동기 작업은 백그라운드에서 함
  //spider을 호출해서 link1에 대한 작업을 예약해두고 , 해당 접수증인(프로미스 객체)를 받음. 
  //즉 promises엔 시작된 각 작업들에 대한 프로미스 객체들이 배열로 담김. 
  return Promise.all(promises); 
  //모든 프로미스들이 완료 (resolve)되길 기다렸다가 끝나면 , 자신도 resolve되는 새로운 프로미스를 반환. 
}

export function spider(url, maxDepth) {
  const filename = urlToFilename(url)

  return exists(filename).then(alreadyExists => {
    if (alreadyExists) {
      if (!filename.endsWith('.html')) {
        // ignoring non-HTML resources
        return
      }

      return readFile(filename, 'utf8').then(fileContent =>
        spiderLinks(url, fileContent, maxDepth)
      )
    }

    // if file does not exist, download it
    return download(url, filename).then(fileContent => {
      // if the file is an HTML file, spider it
      if (filename.endsWith('.html')) {
        return spiderLinks(url, fileContent.toString('utf8'), maxDepth)
      }
      // otherwise, stop here
      return
    })
  })
}