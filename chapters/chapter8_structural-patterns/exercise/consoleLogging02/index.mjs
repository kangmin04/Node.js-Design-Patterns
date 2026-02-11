//(log(), error(), debug(), and info()

const loggingHandler = {
    get(target , property ){
         
        if(typeof target[property] === 'function'){
            return function(...args){ //함수를 리턴해서 출력할 내용을 args에 저장
                const timeStamp = new Date().toISOString();
                target[property](`${timeStamp}` , ...args)
            }
        }

        return originMethod;
    }
}
const createLogProxy = new Proxy(console , loggingHandler )
createLogProxy.log('user' , {name : 'kim'}); 

