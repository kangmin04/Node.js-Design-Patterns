import { request } from 'node:http'
const req = request('http://example.com/somefile.json', res => {
    let buffer; 
    res.on('data' , chunk => buffer+=chunk)
    res.on('end' , () => console.log(JSON.parse(buffer)))
})

req.end() 

/*
    http.request -> return ClientRequest object which is writable Stream. 
    res.end() will starts to send data to the server also it marks req stream as finisehd. 
*/ 