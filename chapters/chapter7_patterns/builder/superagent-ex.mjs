import superagent from 'superagent' // v10.1.1
superagent
/*----------------------세팅 -------------------------------------- */
  .post('https://example.com/api/person')
  .send({ name: 'John Doe', role: 'user' })
  .set('accept', 'json')
/*----------------------세팅 -------------------------------------- */
//여기까진, 세팅 정보만 쌓이고, 실제로 객체를 만들거나 통신은 안된 상태
  .then((response) => {

  })

/**
  builder 패턴이지만, 마지막에 build()가 아닌 then으로 넘어감. 
  superagent는 프로미스가 아니라 , thenable객체! ( js async await , promise는 then 메서드만 가지면 그 객체를 프로미스처럼 다룸)
  프로미스로 하려면 , 애초에 builder의 조건인 .send() , .set()이런 추가 메서드가 불가능함. 
  .then()을하는 순간 실제 HTTP 요청을 함 
 */



  try {
    // await 키워드가 superagent 객체의 .then()을 내부적으로 호출하여 요청을 실행합니다.
    const response = await superagent
      .post('https://example.com/api/person')
      .send({ name: 'John Doe', role: 'user' })
      .set('accept', 'json');
  
    console.log('응답 받음:', response.body);
  } catch (error) {
    console.error('요청 실패:', error);
  }


/*------------------------------superagent builder------------------------------ */
  class SuperAgentRequestBuilder {
    constructor(method, url) {
      this.request = {
        method: method,
        url: url,
        headers: {},
        data: null
      };
    }
  
    // .send()는 데이터를 내부 request 객체에 저장한다.
    send(data) {
      this.request.data = data;
      // 그리고 'this'(빌더 객체 자신)를 반환하여 체이닝을 가능하게 한다.
      return this;
    }
  
    // .set()은 헤더를 내부 request 객체에 저장한다.
    set(key, value) {
      this.request.headers[key] = value;
      // 마찬가지로 'this'를 반환한다.
      return this;
    }
    
    // ... 다른 빌더 메서드들
  }
  

/*-------------------thenable 예시 ------------------------------ */
  class MyRequestBuilder {
    constructor(url) {
      this._url = url;
      this._data = null;
      console.log('1. 빌더 객체가 생성되었습니다. (아직 요청 전)');
    }
  
    send(data) {
      this._data = data;
      console.log('2. 보낼 데이터가 설정되었습니다:', data);
      return this; // 체이닝을 위해 자신을 반환
    }
  
    // 이것이 Thenable의 핵심입니다!
    then(onFulfilled, onRejected) {
      console.log('3. .then()이 호출되어 실제 요청을 시작합니다!');
      
      // 내부적으로 쌓아온 데이터(_url, _data 등)를 사용해 비동기 작업 수행
      const body = JSON.stringify(this._data);
      
      // fetch나 http.request 대신 setTimeout으로 네트워크 요청을 흉내 냅니다.
      setTimeout(() => {
        try {
          console.log(`4. 서버(${this._url})로 데이터를 보냈습니다: ${body}`);
          const response = { success: true, receivedData: this._data };
          
          // 작업이 성공하면 onFulfilled 콜백을 호출하여 결과를 전달합니다.
          // 이것이 await가 결과를 받거나, .then()의 다음 체인으로 넘어가는 원리입니다.
          onFulfilled(response); 
        } catch (error) {
          // 작업이 실패하면 onRejected 콜백을 호출합니다.
          onRejected(error);
        }
      }, 1000); // 1초 딜레이
    }
  }
  
  // 사용 예시
  async function main() {
    console.log('main 함수 시작');
  
    // builder 객체 생성 및 설정. 이 시점까지는 console.log 1, 2만 찍힙니다.
    const requestBuilder = new MyRequestBuilder('https://api.test.com').send({ id: 123 });
  
    // await 키워드가 requestBuilder 객체의 .then() 메서드를 '호출'합니다.
    // 이 순간 console.log 3, 4가 순서대로 찍히게 됩니다.
    const result = await requestBuilder; 
  
    console.log('최종 결과:', result);
    console.log('main 함수 종료');
  }
  
  main();
  