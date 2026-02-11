/*
    8.1 HTTP client cache: 
    Write a proxy for your favorite HTTP client library that caches the response of a given HTTP request, 
    so that if you make the same request again, 
    the response is immediately returned from the local cache, 
    rather than being fetched from the remote URL.
*/
import {request} from 'node:https'
const URL = 'https://jsonplaceholder.typicode.com/todos/1'

function createRequest(url , cb){
  if(cache.has(url)){
    return process.nextTick(() => {
        console.log('[From Cache]')
        cb(cache.get(url))
    })
  }

  const req = request(URL , (res) => {
    let  bodyData= '' ;
    res.on('data' ,(data) => {
        bodyData+=data;
        // console.log('[FROM SERVER]' ,data.toString())
    } )    

    res.on('error' , () => {
        return cb('ERROR HAPPENED')
    })

    res.on('end' , () => {
        // console.log('[FROM SERVER]' ,bodyData); 
        cache.set(url , bodyData);
        return cb('FROM SERVER' + bodyData)
    })
})
 req.end(); 

}

const cache = new Map(); 

createRequest(URL , (firstArg) => {
    console.log(firstArg)

    createRequest(URL ,(secondArg) => {
        console.log(secondArg); // 두 번째 요청 결과 출력
    }); 
})




// const target = {}
// const proxyHandler = {
//     get(target , property){
//         if(property ==='end'){
//             console.log()
//         }
//     }
// }

// const proxyInstance = new Proxy(req , proxyHandler); 
// proxyInstance.end(); 
