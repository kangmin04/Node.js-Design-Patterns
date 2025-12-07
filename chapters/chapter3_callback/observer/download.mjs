import {EventEmitter} from 'node:events'
import {get} from 'node:https'

//const req = get(url , (res) => {}) 
//url 로 get 요청 후 , 다음 코드로 넘어감. 이후 요청을 보낸 서버가 응답을 시작(응답헤더가 도착된 상태) 때 콜백 호출 
//콜백함수 내 인자인 res는 응답 데이터를 담는 읽기가능한 스트림.  ( 콜백함수내 res를 가지고 추후 조작)
//요청에 문제 생길 수 있으니 요청 객체 req반환
function download(url , cb){
    const eventEmitter = new EventEmitter(); 
    const req = get(url , (res) => {   
        const chunks = [];
        let downloadBytes = 0;
        const fileSize = parseInt(res.headers['content-length']);
        console.log('headwer : ' , res.headers) ; 
        console.log('fileSize : ' , fileSize);
        
        res
        .on('error' , err => {cb(err)})
        .on('data' , (chunk) => { // chunk가 올때마다 res.emit('data' , chunk)가 일어남. 
            chunks.push(chunk); 
            downloadBytes+=chunk.length;
            eventEmitter.emit('progress' , downloadBytes , fileSize)
        })
        .on('end' , () => {
            const buffer = Buffer.concat(chunks);
           
            cb(null , buffer)
        })
    })


req.on('error' , (err) => {
    cb(err); 
})               

return eventEmitter;
}


const url = 'https://jsonplaceholder.typicode.com/posts/1';

console.log(`Downloading from ${url}`);

const downloader = download(url, (err, data) => {
    if (err) {
        console.error('Download failed:', err);
        return;
    }
    console.log('\nDownload complete.');
    // The downloaded data is a Buffer. Let's see it as a string.
    console.log('Downloaded data:', data.toString());
});

downloader.on('progress', (downloaded, total) => {
    console.log(
        `${downloaded}/${total} ` + `(${((downloaded/total) * 100).toFixed(2)}%)`)})
    