class ColorConsole {
    // constructor(input){

    // }
    log(){

    }
}


export class RedConsole extends ColorConsole {
    log(input){
        console.log(`\x1b[31m${input}\x1b[31m`)
    }

}

export class BlueConsole extends ColorConsole {
  
    log(input){
        console.log(`\x1b[34m${input}\x1b[34m`)
    }

}


export class GreenConsole extends ColorConsole {

    log(input){
        console.log(`\x1b[32m${input}\x1b[32m`)
    }

}