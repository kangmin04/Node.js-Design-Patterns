import {test, suite} from 'node:test'
import assert from 'node:assert/strict'
import { slugify } from './slugify.mjs'

suite('slugify unit test' , () => {
    test('check refineCharacter function' , () => {
        const target = `Hello World!`; 
        const result = slugify(target); 
        const expectedResult = `hello-world`

        assert.equal(result, expectedResult )
    })
})
