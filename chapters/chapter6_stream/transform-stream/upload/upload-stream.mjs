import { PassThrough, finished } from 'node:stream';
import { createWriteStream } from 'node:fs';

/**
 * 이 함수가 책에서 말하는 "기존의 upload 함수"입니다.
 * Readable 스트림을 인자로 받아서 어딘가로 업로드(여기서는 파일로 저장)합니다.
 * 실제 애플리케이션에서는 AWS S3 SDK나 fetch API 등이 이 역할을 합니다.
 * @param {string} filename
 * @param {import('node:stream').Readable} readableStream
 */
async function upload(filename, readableStream) {
  console.log(`[upload] "${filename}" 업로드 시작됨.`);
  const destination = createWriteStream(`uploaded_${filename}`);
  readableStream.pipe(destination);

  // 스트림이 끝나기를 기다립니다.
  await new Promise(resolve => destination.on('finish', resolve));

  console.log(`[upload] "${filename}" 업로드 완료.`);
}

/**
 * Readable을 인자로 받는 upload 함수를 Writable을 반환하는 함수로 포장합니다.
 * 이 함수가 사용자에게 노출되는 편리한 API가 됩니다.
 * @param {string} filename
 * @returns {import('node:stream').Writable}
 */
function createUploadStream(filename) {
    console.log('[createUploadStream] 업로드 스트림(Writable) 생성 중...');
    const connector = new PassThrough(); 
    
    // 1. 내부적으로는 원래 upload 함수를 즉시 호출합니다. (connector의 Readable 측면을 전달)
    upload(filename, connector)
    
    // 2. 사용자에게는 connector의 Writable 측면을 반환합니다.
    return connector;
}

// --- 최종 사용자의 사용법 ---
console.log('--- 업로드 테스트 시작 ---');

// 사용자는 복잡한 내부를 알 필요 없이, 쓰기 가능한 스트림을 얻습니다.
const myUploadStream = createUploadStream('testfile.txt');

// 이제 얻어온 스트림에 데이터를 쓰기만 하면 됩니다.
console.log('[사용자] 스트림에 "hello world" 데이터를 씁니다.');
myUploadStream.write('hello world');
myUploadStream.write(' and good bye');

// 데이터 전송이 끝나면 .end()를 호출합니다.
console.log('[사용자] 스트림을 닫습니다.');
myUploadStream.end(); 

console.log('--- 업로드 테스트 종료 ---');
