// -------------------module1----------------

// import {someFeature} from './module1/someModule.js' 
// console.log(someFeature); 


// ------------------logger----------------

// import * as loggerModule from './logger/logger.js'
// console.log(loggerModule);

// import { Logger, log as log2 } from './logger/logger.js'
// const log = console.log
// log('개신기함'); 
// log2('message from log2');
// const logger = new Logger('DEFAULT')
// logger.log('Hello world')

// import Mylogger from './logger/logger.js'
// const logger = new Mylogger('DEFAULT')
// logger.log('Hello world')

// import * as loggerModule from './logger/logger.js'
// console.log(loggerModule)


// import Mylog , {info} from './logger/logger.js'
// Mylog('kim'); 

// info('hi') ; 

// -----------------dynamicImport -------------------

// const SUPPORTED_LANGUAGES = ['el' , 'en' , 'es' , 'fr' , 'ko'] ; 
// const selectedLanguage = process.argv[2]; 

// if(!selectedLanguage){
//   console.error(
//     `Please specify a language
   
//     Usage: node ${process.argv[1]} <language_code>
//     Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`
//   )
//   process.exit(1)
// }
// if(!SUPPORTED_LANGUAGES.includes(selectedLanguage)){
//   console.error('The specified language is not supported')
//   process.exit(1)
// }

// const strings = await import(`./dynamicImport/strings-${selectedLanguage}.js`);
// strings.default(); 
// console.log(process);
// console.log(process.argv[0] , process.argv[1] , process.argv[2] , process.argv[3])



// console.log(import.meta.resolve('http'))

// -----------------------loading--------------------

// import { count , increment } from "./loading/counter.js";
// console.log(count); 
// increment() ;  //원본 변수가 변경되는 것이기에 counter도 바뀜. 
// console.log(count); 
// count++;   // original value 안바뀜.  read-only binding. 
// console.log(count)

//common js는 shallow copy. 


// import * as a from './loading/a.js' 
// import * as b from './loading/b.js'
// console.log('a ->', a)
// console.log('b ->', b)


// -------------------------------logger2------------------------


// import { logger } from './logger2/logger2.js'
// import './logger2/colorizeLogger2.js' // colorizeLogger가 export를 하지않기에 omit을 생략한 형태로 작성 
// logger.info('Hello, World!')
// logger.warn('Free disk space is running low')
// logger.error('Failed to connect to database')
// logger.debug('main() is starting')


// import {logger } from './logger2/logger2.js'
// import './logger2/replaceLogger3.js'

// logger.info('msg')



import loggerModule from './logger2/logger2.js'
import './logger2/replaceLogger3.js'


// import {logger } from './logger2/logger2.js'
// import './logger2/replaceLogger3.js'

loggerModule.logger.info('hello'); 