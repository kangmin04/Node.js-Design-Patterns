/*
    8.5 The lazy buffer: 
    Can you implement createLazyBuffer(size),
    a factory function that generates a virtual proxy for a Buffer of the given size? 
    The proxy instance should instantiate a Buffer object (effectively allocating the given amount of memory) only when write() is being invoked for the first time. 
    If no attempt to write into the buffer is made, no Buffer instance should be created.
*/

function createLazyBuffer(size){
    return new Proxy(Buffer , {
        get(target , property){
            if(property === 'write'){
                return function(data){
                    const buf = target.alloc(size);
                    buf.write(data);
                    console.log(buf.toString('utf-8'))
                }
            }

            return target[property]; 
        }
    })
}

const lazyBuffer = createLazyBuffer(12); 
lazyBuffer.write('test') //--> invoke 
