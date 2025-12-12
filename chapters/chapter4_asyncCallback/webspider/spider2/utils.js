import { constants, access } from 'node:fs'
import { extname, join } from 'node:path'
import { mkdirp } from 'mkdirp'
import slug from 'slug'
import { Parser } from 'htmlparser2'

export function exists(filePath, cb) {
  access(filePath, constants.F_OK, err => {
    if (err) {
      if (err.code === 'ENOENT') {
        // the file does not exist
        return cb(null, false)
      }
      // unexpected error checking the file
      return cb(err)
    }

    // the file exists
    return cb(null, true)
  })
}

export function urlToFilename(url) {
  const parsedUrl = new URL(url)
//   console.log('[utils.urlToFilename]  parsedUrl: ', parsedUrl)
  const urlComponents = parsedUrl.pathname.split('/')
//   console.log('[utils.urlToFilename] parsedurl.pathname : ', parsedUrl.pathname)
  const originalFileName = urlComponents.pop()
//   console.log('[utils.urlToFilename] originalFileName : ', originalFileName)
//   console.log('[utils.urlToFilename] urlcomponent : ', urlComponents)
  const urlPath = urlComponents
    .filter(component => component !== '') //blank removed
    .map(component => slug(component, { remove: null }))
    .join('/')

    // console.log('[utils.urlToFilename] Urlpath : ' , urlPath); 
  const basePath = join(parsedUrl.hostname, urlPath)
//   console.log('baseurl : ' , basePath)
  const missingExtension = !originalFileName || extname(originalFileName) === ''
  if (missingExtension) {
    return join(basePath, originalFileName, 'index.html')
  }

  return join(basePath, originalFileName)
}

// NOTE: this function is just for illustrative purposes. We are wrapping
// fetch in a callback-based API because at this point of the book we want
// to demonstrate callback based patterns
export function get(url, cb) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
      }
      // NOTE: this loads all the content in memory and therefore is not suitable
      // to handle large payloads.
      // For large payloads, we would need to use a stream-based approach
      return response.arrayBuffer()
    })
    .then(content => cb(null, Buffer.from(content)))
    .catch(err => cb(err))
}

// NOTE: this function is just for illustrative purposes. We are wrapping
// mkdirp in a callback-based API because at this point of the book we want
// to demonstrate callback based patterns
export function recursiveMkdir(path, cb) {
  mkdirp(path)
    .then(() => cb(null))
    .catch(e => cb(e))
}


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