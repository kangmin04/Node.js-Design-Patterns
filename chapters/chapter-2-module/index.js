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



console.log(import.meta)