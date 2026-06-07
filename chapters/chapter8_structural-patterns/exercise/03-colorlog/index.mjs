//decorator
/*
    BUT 전역객체인 console에 직접적인 수정을 함. -> 좋은 코드가 아님. 
    프록시로 객체에 대한 수정없이 hanlder로 처리하는게 더 이상적이다. 
*/
import styles from 'ansi-styles';

function decoratorLog(console){
    console.red = (data) => {
        console.log(`${styles.red.open}${data}${styles.red.close}`);
    }

    console.yellow = (data) => {
        console.log(`${styles.yellow.open}${data}${styles.yellow.close}`);
    }

    console.green = (data) => {
        console.log(`${styles.green.open}${data}${styles.green.close}`);
    }

    return console
}

const decorateLog = decoratorLog(console);
decorateLog.red('THIS IS RED'); 
decorateLog.yellow('THIS IS RED'); 
decorateLog.green('THIS IS RED'); 