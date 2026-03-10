import assert from 'node:assert/strict'
import { mock, suite, test } from 'node:test'
import { setImmediate } from 'node:timers/promises'

/*
    concurrency: true로 두 테스트 진행 시 
    같은 모듈을 import로 concurrent하게 진행할 경우 -> 이미 import되었다고 뜸. 
*/
suite('Save config', {concurrency: false, timeout: 500} , () => {
    test('Creates folder (if needed)', async t => {
        const mockMkdir = mock.fn(); 
        /* mkdir은 called된건지 track위함 -<> spy */
        const mockAccess = mock.fn(async _t => {
            await setImmediate(); 
            throw new Error('ENOENT')
        })
        /* access자체는 비동기 작업. missing 처리를 위해 throw error */

        t.mock.module('node:fs/promises', {
            cache: false, 
            namedExports: {
                access: mockAccess, 
                mkdir: mockMkdir, 
                writeFile: mock.fn()
                /* write file로 mock 되긴하지만, 현재 테스트에선 대상 아님.  */
            }
        })
        
        /* 
            mock이 된 후에!! import함. 
            만약 mock전에 import 한다면, saveConfig 내의 실제 모듈이 반영됨. 즉, t.mock.method 적용안됨
            mocking은 mock이 등록된 이후에 module이 로드되어야만 실헹됨
        */
        const {saveConfig} = await import('./saveConfig.mjs')
        await saveConfig('./path/to/configs/app.json', { port: 3000 })
        assert.equal(mockMkdir.mock.callCount(), 1)
    })

    test('Does not create folder (if exists)', async t => {
        const mockMkdir = mock.fn()
        const mockAccess = mock.fn(async _path => {
          await setImmediate()
        })
        t.mock.module('node:fs/promises', {
          cache: false,
          namedExports: {
            access: mockAccess,
            mkdir: mockMkdir,
            writeFile: mock.fn(),
          },
        })
        const { saveConfig } = await import('./saveConfig.mjs')
        await saveConfig('./path/to/configs/app.json', { port: 3000 })
        assert.equal(mockMkdir.mock.callCount(), 0)
      })
})