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


loggerModule.logger = {
    info : (message) => {
        console.log(`${GREEN}${message}${RESET}`)
    
    }
}