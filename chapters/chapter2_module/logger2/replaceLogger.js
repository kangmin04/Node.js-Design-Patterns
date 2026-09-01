import { logger } from './logger2.js'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GREEN = '\x1b[32m'
const WHITE = '\x1b[37m'
const RESET = '\x1b[0m'

// 의도된 실험: import된 바인딩은 재할당 불가 -> 실행 시 TypeError로 실패하는 것을 확인하기 위한 코드
// eslint-disable-next-line no-import-assign
logger = {
    info : message => {
        console.log('message , changed. ')
    }
}