
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
class RequestBuilder{
    constructor(){
        this.options = {
        }

        this.queryParams = new URLSearchParams(); 
        this.basePath = '/'
    }

    setMethod(method){
        this.options.method = method.toUpperCase(); 
        return this; 
    }

    setUrl(url){
        const parsedUrl = new URL(url); 
        // console.debug(parsedUrl)
        this.options.hostname = parsedUrl.hostname
        this.options.protocol = parsedUrl.protocol
        this.options.port = parsedUrl.port || 443
        this.options.path = parsedUrl.pathname
        return this; 
    }

    setTimeLimit(timeout){
        this.options.timeout = timeout;
        return this; 
    }

    setQuery(key, value){
        this.queryParams.append(key , value) 
        return this; 
    }

    setBody(data){
        this.bodyData = JSON.stringify(data); 
        /* post 시 header 설정해줘야함.  */
        this.header('Content-Length', Buffer.byteLength(this.bodyData));
        this.header('Content-Type', 'application/json');
        return this;  
    }

    invoke(){
        return new Promise((resolve , reject) => {
            console.debug('options : ' , this.options)
            let bodyData = ''; 
            const req = https.request(this.options , res => {
                console.log(`STATUS: ${res.statusCode}`);
                console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                  bodyData+=chunk.toString(); 
                });
                res.on('end', () => {
                    console.log('No more data in response.');
                    resolve(bodyData)
                });
            })
            
            req.on('error', (e) => {
                console.error(`problem with request: ${e.message}`);
                reject(e.message)
            });

            req.end()
        })
    }
}

const builder = new RequestBuilder() ; 
const result = await builder
    .setMethod('Get')
    .setUrl('https://jsonplaceholder.typicode.com/posts/1')
    .setTimeLimit(500)
    .invoke();


    
console.log(result)


