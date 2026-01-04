import { Readable } from "node:stream";

const mountains = [
    { name: 'Everest', height: 8848 },
    { name: 'K2', height: 8611 },
    { name: 'Kangchenjunga', height: 8586 },
    { name: 'Lhotse', height: 8516 },
    { name: 'Makalu', height: 8481 }
  ]
  

function * mountainGenerator () {
    for (const mountain of mountains) {
      yield mountain
    }
  }
  // Readable.from()에 제너레이터(게으른 이터러블)를 전달합니다.
  // 이렇게 하면 스트림은 소비자가 데이터를 요청할 때만 제너레이터에서
  // 데이터를 가져오므로 메모리를 효율적으로 사용할 수 있습니다.
const mountainsStream = Readable.from(mountainGenerator()) 
//지금까진 paused상태
//readable.from으로 스트림 객체의 내부 로직 전달


mountainsStream.on('data', (mountain) => { //on 부착하면서 flowing mode로 .. -> 내부적으로 _read()호출됨
    console.log(`${mountain.name.padStart(14)}\t${mountain.height}m`)
  })
//read() 호출 시 제너레이터 yield로 다음 데이터 가져옴 
//해당 데이털르 this.push()로 internal buffer로 넣고 
//push된 데이터는 'data' 이벤트로 전달... -> console.log됨


//mountainStream자체는 데이터 파이프임.. 데이터를 담는 객체가 아니다. 

//메모리엔 항상 highWaterMark 만큼의 적은 데이터만 유지 ->  효율적 처리 가능