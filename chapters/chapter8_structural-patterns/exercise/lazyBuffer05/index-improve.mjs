/*
    8.5 The lazy buffer: 
    Can you implement createLazyBuffer(size),
    a factory function that generates a virtual proxy for a Buffer of the given size? 
    The proxy instance should instantiate a Buffer object (effectively allocating the given amount of memory) only when write() is being invoked for the first time. 
    If no attempt to write into the buffer is made, no Buffer instance should be created.
*/

function createLazyBuffer(size){
    let buffer = null; 
    let offset = 0; 
    function ensureBuffer(){
        if(!buffer){
            buffer = Buffer.alloc(size);
        }
    }
    return new Proxy({} , {
        get(target , property){
            if(property === 'write'){
                ensureBuffer(); //buffer 생성 
                return function(data){
                    buffer.write(data , offset)
                    offset += data.length; 
                }
            }

            if(property === 'toString'){
                if(!buffer){
                    return 'PLZ MAKE BUFFER FIRST'
                }
                return buffer.toString('utf-8' , 0 , offset)
            }

            const prop = buffer[property]; 
            return typeof prop === 'function' ? prop.bind(buffer) : prop; 
            
        }
    })
}

const lazyBuffer = createLazyBuffer(16); 
lazyBuffer.write('test') 
console.log(lazyBuffer.toString)
lazyBuffer.write(' next line') 
console.log(lazyBuffer.toString )


/*
    console.log(lazyBuffer.toString ) 이런 접근은 메서드로 호출하는게 아님. 속성으로 접근하는것. 
    프록시는 원래 객체 사용을 그대로 따라해야하기에. 속성접근은 부적합. 
    
            if(property === 'toString'){
                if(!buffer){
                    return 'PLZ MAKE BUFFER FIRST'
                }
                return buffer.toString('utf-8' , 0 , offset)
            }
    다음 코드는 toString 시 문자열을 즉시반환.. 즉 function이 아님. 
     if(property === 'toString'){
        return () => {
            if(!buffer){
                return 'PLZ MAKE BUFFER FIRST'
            }
                return buffer.toString('utf-8' , 0 , offset)
        }
    }
    이렇게 리턴자체를 함수로 할 경우.... 
    lazyBuffer.toString 시 화살표 함수가 ㅜ반환됨. () => {}이런식
    그럼 lazyBuffer.toString() 시 실제 내부 로직이 호출됨 ! 
*/
