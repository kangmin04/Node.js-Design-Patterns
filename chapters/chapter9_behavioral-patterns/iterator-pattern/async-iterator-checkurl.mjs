export class CheckUrls {
  #urls
  constructor(urls) {
    this.#urls = urls
  }

  [Symbol.asyncIterator]() {
    // const urlsIterator = Iterator.from(this.#urls)
    const urlsIterator = this.#urls[Symbol.iterator]()
    

    return {
      async next() {
        const iteratorResult = urlsIterator.next()
        
        if (iteratorResult.done) {
          return { done: true }
        }

        const url = iteratorResult.value
        try {
          const checkResult = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(5000), // 5 secs timeout
          })
          if (!checkResult.ok) {
            return {
              done: false,
              value: `${url} is down, error: ${checkResult.status} ${checkResult.statusText}`,
            }
          }
          return {
            done: false,
            value: `${url} is up, status: ${checkResult.status}`,
          }
        } catch (err) {
          return {
            done: false,
            value: `${url} is down, error: ${err.message}`,
          }
        }
      },
    }
  }
}


const checkUrls = new CheckUrls([
    'https://nodejsdesignpatterns.com',
    'https://example.com',
    'https://mustbedownforsurehopefully.com',
    'https://loige.co',
    'https://mario.fyi',
    'https://httpstat.us/200',
    'https://httpstat.us/301',
    'https://httpstat.us/404',
    'https://httpstat.us/500',
    'https://httpstat.us/200?sleep=6000',
  ])
  
  for await (const status of checkUrls) {
    console.log(status)
  }