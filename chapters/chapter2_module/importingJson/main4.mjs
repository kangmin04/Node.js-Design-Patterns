import {createRequire} from 'node:module'; 

const require = createRequire(import.meta.url); 
const data = require('./data.json'); 
console.log(import.meta.url , require , data)

