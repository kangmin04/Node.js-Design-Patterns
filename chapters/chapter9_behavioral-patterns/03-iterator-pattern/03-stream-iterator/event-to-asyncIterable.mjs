import { EventEmitter , on} from 'node:events';

const myEmitter = new EventEmitter();

setInterval(() => {
    myEmitter.emit('ping', { timestamp: Date.now() });
  }, 1000);

  /* 전통적 방식 
  Push 방식임. data가 emit될 때마다 , myEmitter.on('ping') 은 해당 이벤트 발생하면 처리함. 
  스트림의 flow mode와 유사함. 
  */
myEmitter.on('ping', (data) => {
    console.log('[PUSH]', data);
});


  /* Pull 방식은 데이터 처리 가능하게끔 준비됐을 때 데이터를 요청해서 가져오는 것. for.. of 방식! 
    non-flow 모드인 소비자가 readable.read()를 명시적으로 호출하기 전엔 data 이벤트 발생안함. -> for await .. of는 non flow 모드를 추상화 한것. 
  */
async function listen(){
    const eventIterator = on(myEmitter, 'ping');
    for await (const [data] of eventIterator){
        console.log('[PULL] ping received : ' , data.timestamp)
    }
}

listen(); 