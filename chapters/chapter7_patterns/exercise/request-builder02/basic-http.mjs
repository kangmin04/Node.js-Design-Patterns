import https from 'node:https'; // 1. https 모듈 사용

const postData = JSON.stringify({
  title: 'My Great Post',
  body: 'This is the content of the post.',
  userId: 1,
});

const options = {
  hostname: 'jsonplaceholder.typicode.com', // 2. 프로토콜 제외
  port: 443, // 3. https 기본 포트
  path: '/posts',
  method: 'POST', // 4. 데이터를 보내려면 POST 메서드 사용
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

// 요청 body에 데이터 쓰기
req.write(postData);
req.end();
