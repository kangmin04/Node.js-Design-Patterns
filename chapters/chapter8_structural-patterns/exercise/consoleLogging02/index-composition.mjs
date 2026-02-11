class ProxyLog {
    constructor(console){
        this.console = console
    }
    log(arg){
        let day = new Date(); 
        return this.console.log( `[${day}] ${arg}`)
    }

    info(arg){
        let day = new Date(); 
        return this.console.info( `[${day}] ${arg}`)
    }
}

const proxyLogInstance = new ProxyLog(console); 
proxyLogInstance.log('HELLO'); 

proxyLogInstance.info('BYE'); 