import * as loggerModule from './logger2.js'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GREEN = '\x1b[32m'
const WHITE = '\x1b[37m'
const RESET = '\x1b[0m'

// console.log(loggerModule)
// loggerModule.logger = {
//     info : (message) => {
//         console.log(`${GREEN}${message}${RESET}`)
    
//     }
// }


// 의도된 실험: namespace import(loggerModule)의 멤버도 재할당 불가 -> TypeError로 실패하는 것을 확인하기 위한 코드
// eslint-disable-next-line no-import-assign
loggerModule.logger = {
    info : (message) => {
        console.log(`${GREEN}${message}${RESET}`)

    }
}