import styles from 'ansi-styles';

const proxyLog = new Proxy(console , {
    get(target , property){
        
        if(target[property] === undefined){  //Non Predefined Method 
            if(property in styles){ //color property
                return function(text){
                    target.log(`${styles[property].open}${text}${styles[property].close}`)
                }    
            }
            return function(){
                console.log('WRONG METHOD FOR CONSOLE' )
            }
        }
        //defined method
        return target[property].bind(console)
 
    }}
)

proxyLog.red('hi~')
proxyLog.yellow('hi~')
proxyLog.green('hi~')
proxyLog.log('test')
proxyLog.dsds('test')





   //     if(color ==='red'){
    //         return function printRed(text){
    //             target.log(`${styles.red.open}${text}${styles.red.close}`)
    //         }
    //     }

    //     if(color ==='yellow'){
    //         return function printYellow(text){
    //             target.log(`${styles.yellow.open}${text}${styles.yellow.close}`)
    //     }
    // }

    //     if(color === 'green'){
    //         return function printGreen(text){
    //             target.log(`${styles.green.open}${text}${styles.green.close}`)
    //     }