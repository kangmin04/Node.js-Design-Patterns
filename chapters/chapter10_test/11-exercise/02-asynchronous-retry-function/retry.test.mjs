import {test, suite, mock} from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises';
import { fetchWithRetry } from './retry.mjs';

suite('test code' , () => {
    test('retry test' , async () => {
        const asyncFn = mock.fn(async (i) => { 
        await setImmediate(); 
        if( i < 3){
                throw new Error('intentional error'); 
            }
            return 'success'
               
        })

        const result = await fetchWithRetry(asyncFn, 3); 
        const expectedResult = 'success'

        assert.equal(result, expectedResult); 
        assert.equal(asyncFn.mock.callCount(), 3)
        
    })

    test('always reject', async () => {
        const asyncFn = mock.fn(async (i) => { 
            await setImmediate(); 
            throw new Error('intentional error');     
        })

        const result = await fetchWithRetry(asyncFn, 3); 
        const expectedResult = 'intentional error occured last 3'

        assert.equal(result, expectedResult); 
        assert.equal(asyncFn.mock.callCount(), 3)
        
    })
})