export function wrapperQueue(target, options){
    const {initMethod, initProperty, watchMethods} = options; 
    let isInitialized = false; 
    const queue = []

    return new Proxy(target, {
        get(target, property){ //get은 속성에 접근할 때 호출됨. (get에 async 사용할경우, proxy.query 호출하면 프로미스가 반환되어 안됨!! )
            if(typeof target[property] !== 'function') return target[property];

            return function(...args){                
                if(property === initMethod){
                    return target[property].apply(target, args).then((result) => {
                        // target[initProperty] = true; // 초기화 완료 
                        isInitialized = true; 
                        while(queue.length > 0){
                            const { prop, params, resolve, reject } = queue.shift();
                            try {
                                resolve(target[prop].apply(target, params));
                            } catch (err) {
                                reject(err);
                            }
                        }
                        return result
                    })
                }
                /*
                    target[prpperty].apply(target, args)
                    target 객체의 property라는 이름의 메서드를 호출해라. 
                    이때, 메서드 내부의 this는 target 객체를 가리키도록 하고, 
                    args 배열에 있는 요소들을 순서대로 그 메서드의 인자로 전달해라.
                */
                if(watchMethods.includes(property) && !isInitialized){ 
                    return new Promise((resolve, reject) => {
                        queue.push({prop: property, params: args, resolve, reject})
                    })
                }

                return target[property].apply(target, args);
            }}
        })

 
    }            

    

