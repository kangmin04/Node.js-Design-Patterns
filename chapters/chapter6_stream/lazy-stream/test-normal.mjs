// test-normal.mjs
import { createReadStream } from 'node:fs';

console.log('1. createReadStream("file.txt")를 즉시 호출합니다.');
// ★★★ 바로 이 시점에 Node.js는 file.txt 파일을 열고 파일 디스크립터(File Descriptor)를 할당받습니다.
const normalStream = createReadStream('file.txt'); 
console.log('2. 파일이 이미 열렸습니다. 시스템 자원이 할당되었습니다.');
console.log('   (아직 데이터만 흐르지 않을 뿐입니다)');

setTimeout(() => {
    console.log('\n3. 5초 후, .pipe()를 호출하여 이미 열려있는 파일로부터 데이터 흐름을 시작합니다.');
    normalStream.pipe(process.stdout);
}, 5000);

//일반 readStream -> 즉시 파일 시스템에 접근하여 파일엶. 이때 파일 디스크립트 할당됨
//파일은 계속 열려있는 상태며, 프로세스가 파일 자원 공유중임
//pipe() 시 이미 열려있는 파일로부터 읽음 
//수백개 파일 동시에 열 때, 모두 즉시 열고 대기해야함. os는 한 프로세스에 허용하는 파일 디스크립트 양에 제한있다. 


//lazyStream 방식 -> new LazyStream()은 단지 가벼운 js 객체를 만들뿐. 파일은 건들이지 않음
//_read()가 호출되면서 factory함수 통해서 createReadStrem 호출되면서 파일이 열림
//수백 개 요청 시 가벼운 lazyStream 객체만 생성하고, 각 사용자 네트워크가 준비되서 실제로 데이터 요청 순서대로 하나씩 열림 
//훨씬 적은 자원으로 안정적 서비스 가능 