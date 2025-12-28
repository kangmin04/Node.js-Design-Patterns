import { constants } from 'node:fs'
import {access } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { mkdirp } from 'mkdirp'
import slug from 'slug'
import { Parser } from 'htmlparser2'

export function exists(filePath) {
  return access(filePath, constants.F_OK)
    .then(() => true)
    .catch((err) => {
      if(err.code === 'ENOENT') {
        return false
      }
      throw err
})
}

export function urlToFilename(url) {
  const parsedUrl = new URL(url)
  const urlComponents = parsedUrl.pathname.split('/')
  const originalFileName = urlComponents.pop()
  const urlPath = urlComponents
    .filter(component => component !== '') //blank removed
    .map(component => slug(component, { remove: null }))
    .join('/')
  const basePath = join(parsedUrl.hostname, urlPath)

  const missingExtension = !originalFileName || extname(originalFileName) === ''
  if (missingExtension) {
    return join(basePath, originalFileName, 'index.html')
  }

  return join(basePath, originalFileName)
}


export function get(url) {
  //항상 리턴을 잘 해주자 !! 여기서 리턴을 안해주면 그냥
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
      }
      return response.arrayBuffer()
    })
    .then(content => 
      Buffer.from(content)
    ) // 화살표함수도 () => {}면 꼭 리턴을 명시해줘야함. 

    // .catch(err => cb(err))
}

export const recursiveMkdir = mkdirp ; 


export function getPageLinks(currentUrl, body) {
  const url = new URL(currentUrl)
  const internalLinks = []
  const parser = new Parser({
    onopentag(name, attribs) { //when openingHtmlTag ( ex) <a> <p>) found , opentag event called
      if (name === 'a' && attribs.href) { //<a> tagf + href 
        const newUrl = new URL(attribs.href, url)
        if (
          newUrl.hostname === url.hostname && //only same domain. 
          newUrl.pathname !== url.pathname
        ) {
          internalLinks.push(newUrl.toString())
        }
      }
    },
  })
  parser.end(body)

  return internalLinks
}