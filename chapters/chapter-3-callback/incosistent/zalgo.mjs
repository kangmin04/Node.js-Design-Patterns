import {readFile} from 'node:fs'

const cache = new Map(); 
// cache.set('1' , '3'); 
// console.log(cache);  //Map(1) {'1' => '3'}
// console.log(cache.has('1'));  //true
// console.log(cache.get('1')); //3

function incosistentRead(filename , cb){
    if(cache.has(filename)){
        console.log('Cache hit! Executing synchronously.');
        cb(cache.get(filename)); //in synchronosly
    }else{
        console.log('Cache miss! Reading file asynchronously.');
        readFile(filename , 'utf-8' , (_err , data) => {  // in asynchrously
            cache.set(filename , data);
            cb(data); 
        })
    }
}

function createFileReader(filename){
    const listeners = [];
    incosistentRead(filename, (value) => {
        for (const listener of listeners){
            listener(value);
        }
    })

    return {
        onDataReady : listener => listeners.push(listener) //여기서 lister 은 콜백함수 ! ( 이벤트 리스너 , 핸들러임 ! )
    }
}

const reader1 = createFileReader('data.txt');  //reader1 변수엔 { onDataReady: [Function] } 형태의 객체가 저장
reader1.onDataReady((value) => { //()=>console.log가 listener로써 listerners 배열에 push 됨.
    console.log(value); //비동기적으로 작동하기에 , onDataReady 메서드로 리스너 먼저 등록하고 파일 읽기 종료 후 해당 리스너 실행. 
})

// const reader2 = createFileReader('data.txt'); 
// reader2.onDataReady((value) => {
//     console.log('read2'  , value);
// })

setTimeout(() => { console.log('\n--- After 100ms ---');
    const reader2 = createFileReader('data.txt'); 
    reader2.onDataReady((value) => {
        // 이 콜백은 실행되지 않을 것입니다.
        console.log('Reader 2 data:', value);
    });
    console.log('Reader 2 created. Will its callback run?');
    
} , 100)

//zalgo 문제를 의도했으나 , setTimeout 없이 사용하면 정상적으로 출력됨
// 빠른 동기 실행: reader1과 reader2를 생성하는 코드는 매우 빠르게 연속적으로 실행됩니다.
// 느린 비동기 I/O: reader1에서 호출된 fs.readFile은 파일 시스템에 접근해야 하므로 상대적으로 "느린" 작업입니다. 이 작업이 완료되기까지는 약간의 시간이 걸립니다.
// 경쟁 상태(Race Condition): reader1의 fs.readFile이 완료되어 콜백을 실행하고 캐시(cache)에 데이터를 저장하기 전에, 이미 reader2를 생성하는 코드가 실행됩니다.
// 결과: reader2의 incosistentRead 함수가 호출될 시점에도 캐시는 여전히 비어있습니다. 따라서 reader2 역시 fs.readFile을 사용하는 비동기 경로로 실행됩니다.
// 결론적으로, 두 리더 모두 비동기적으로 동작했기 때문에 onDataReady로 리스너(콜백)를 등록할 충분한 시간을 가졌고, 이후 파일 읽기가 완료되었을 때 두 콜백 모두 정상적으로 호출된 것입니다.

