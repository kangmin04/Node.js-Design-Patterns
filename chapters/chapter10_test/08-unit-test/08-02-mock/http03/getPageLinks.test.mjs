import assert from 'node:assert/strict'
import { afterEach, beforeEach, suite, test } from 'node:test'
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici' // v7.6.0
import { getInternalLinks } from './getPageLinks.mjs'

suite('getpagelinks' , {concurrency: true, timeout: 500}, async() => {
    test.skip('It fetches all the internal links from a page', async() => { // #1. 
        const links = await getInternalLinks('https://loige.co')
        assert.deepEqual(links, 
            new Set([
                'https://loige.co/blog' ,
                'https://loige.co/speaking' , 
                'https://loige.co/about'
            ])
        )
    })

    test('It fetches all the internal links from a page' , async(t) => {
        const mockHtml = `
        <html>
          <body>
            <a href="https://loige.co/blog">Blog</a>
            <a href="/speaking">Speaking</a>
            <a href="/about">About</a>
            <a href="https://www.linkedin.com/in/lucianomammino/">My LinkedIn profile</a>
            <a href="/about">About</a>
          </body>
        </html>
      `
      /* global fetch를 mock. -> fetch call 시 미리 설정해둔 값으로 리턴가능  */
      t.mock.method(global, 'fetch', async _url => ({ 
        ok: true,
        status: 200,
        headers: {
          get: key =>
            key === 'content-type' ? 'text/html; charset=utf-8' : null,
        },
        text: async () => mockHtml,
      }))

      const links = await getInternalLinks('https://loige.co')
      assert.deepEqual(links, 
          new Set([
              'https://loige.co/blog' ,
              'https://loige.co/speaking' , 
              'https://loige.co/about'
          ])
      )
    })

    test('It fetches all the internal links from a page (with undici)', async _t => {
      const agent = new MockAgent()
      agent.disableNetConnect() //unmocked된게 실수로 실제 network에 git안되게 -> isolation 위함 
      setGlobalDispatcher(agent)
  
      const mockHtml = `
      <html>
        <body>
          <a href="https://loige.co/blog">Blog</a>
          <a href="/speaking">Speaking</a>
          <a href="/about">About</a>
          <a href="https://www.linkedin.com/in/lucianomammino/">My LinkedIn profile</a>
          <a href="/about">About</a>
        </body>
      </html>
    `
  
      agent
        .get('https://loige.co')
        .intercept({
          path: '/',
          method: 'GET',
        })
        .reply(200, mockHtml, {
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        })
  
      const links = await getInternalLinks('https://loige.co')
  
      assert.deepEqual(
        links,
        new Set([
          'https://loige.co/blog',
          'https://loige.co/speaking',
          'https://loige.co/about',
        ])
      )
    })
  })


/*
    #1. 현재 테스트의 단점 
    1. 실제 website에 test 결과 depend됨
        - loieg.co 내용이 변경된다면 코드가 멀쩡해도 ERROR
    2. test is not predictable
        - network 등 이슈로 반환되는 결과가 매번 달라질수도있음. 테스트는 항상 동일한 결과를 보장해야함 
    3. 에러(return non-html response) 케이스를 테스트 못함
        - 실제 fetch이기에 실제로 error을 리턴하는 url을 찾아서 넣어야함. 
*/




suite('example with undici and beforeEach + afterEach', () => {
  let agent
  const originalGlobalDispatcher = getGlobalDispatcher()

  beforeEach(() => {  //모든 테스트 실행 전에 code 실행 
    agent = new MockAgent()
    agent.disableNetConnect()
    setGlobalDispatcher(agent)
  })

  afterEach(() => { // 테스트 이후에 실행되는 훅 -> 원래 dispatcher로 restore
    setGlobalDispatcher(originalGlobalDispatcher)
  })

  test('a test...', () => {
    /* ... */
  })
  test('another test...', () => {
    /* ... */
  })
})
