import {readFile} from 'node:fs'

readFile('data.txt' , 'utf-8' , (_err , data) => {
    console.log('Data from file: ' , data)
})

let scheduledNextTicks = 0; 
function recursiveNextTick(){
    if(scheduledNextTicks++ > 1000){
        return 
    }

    console.log('Keep the event loop busy');
    process.nextTick(() => {recursiveNextTick()});
}

recursiveNextTick(); 