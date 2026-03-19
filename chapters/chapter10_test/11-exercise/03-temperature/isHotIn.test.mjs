import {test, suite, mock} from 'node:test'
import assert from 'node:assert/strict'
import { isHotIn , isHotInDI} from './isHotIn.mjs';
import { setImmediate } from 'node:timers/promises';

suite('weather test leveraging global mock' , () => {  /* {concurrency: true} 시, fetch는 공유자원이기에 race conditions 발생할 가능성 존재함 */
    test('is hot in C',async (t) => {
        t.mock.method(global, 'fetch', async _url => ({
            temp: 43, 
            unit: 'C'
        }))
        const expectedUrl = 'testURL'
        const isHot = await isHotIn('testURL')

        const [resultURL] = fetch.mock.calls[0].arguments
        assert.equal(expectedUrl, resultURL)

        assert.ok(isHot)

    })

    test('is hot in F', async (t) => {
        t.mock.method(global, 'fetch', async _url => ({
            temp: 90, 
            unit: 'F'
        }))
        const expectedUrl = 'testURL'
        const isHot = await isHotIn('testURL')

        const [resultURL] = fetch.mock.calls[0].arguments
        assert.equal(expectedUrl, resultURL)

        assert.ok(isHot)

    })
})

suite('weather test leveraging DI ' , () => {
    test('is hot in C',async (t) => {
        let arg = ''
        const isHotObj = {
            url: 'testURL' , 
            fetch: async (argument) => {
                arg = argument; 
                await setImmediate(); 
                return {
                    temp: 43, 
                    unit: 'C'
                }
            }
        }

        const expectedUrl = 'testURL'
        const isHot = await isHotInDI(isHotObj)

        assert.equal(expectedUrl, arg)

        assert.ok(isHot)

    })

})


suite('weather test leveraging DI BETTER VERSION!!  ' , () => {
    test('is hot in C',async (t) => {
        const expectedUrl = 'testURL'
        const mockFetch = mock.fn(async (url) => {
            return {temp: 43, unit: 'C'}
        })
       
        const isHot = await isHotInDI({fetch: mockFetch, url: expectedUrl})

        // 호출이 1번 되었는지 확인
        assert.strictEqual(mockFetch.mock.calls.length, 1);
        // 첫 번째 호출의 첫 번째 인자가 expectedUrl과 같은지 확인
        assert.strictEqual(mockFetch.mock.calls[0].arguments[0], expectedUrl);
        // isHot의 결과가 true인지 확인
        assert.ok(isHot);

    })

})