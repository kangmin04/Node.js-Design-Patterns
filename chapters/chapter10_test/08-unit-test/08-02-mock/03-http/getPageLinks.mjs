import {Parser} from 'htmlparser2'

export async function getInternalLinks(pageurl){
    const url = new URL(pageurl)
    const response = await fetch(pageurl); 
    if(!response.ok){
        throw new Error(`Failed to fetch ${pageurl} with status ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if(contentType === null || !contentType.includes('text/html')){
        throw new Error(`Content type of ${pageurl} is not text/html`)
    }

    const body = await response.text() //.text()-> promise return + 정해둔 mock fetch 에선, mockHtml 리턴 
    const internalLinks = new Set(); 
    const parser = new Parser({

        onopentag(name, attribs){
            if(name === 'a' && attribs.href){
                const newUrl = new URL(attribs.href, pageurl)
                if(newUrl.hostname === url.hostname && newUrl.pathname !== url.pathname){
                    internalLinks.add(newUrl.toString())
                }
            }
        }
    })

    parser.end(body)
    return internalLinks; 
}