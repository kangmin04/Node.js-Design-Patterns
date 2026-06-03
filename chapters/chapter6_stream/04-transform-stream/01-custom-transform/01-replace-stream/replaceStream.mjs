// replaceStream.js
import {Transform } from 'node:stream'
export class ReplaceStream extends Transform {
  constructor(searchStr, replaceStr, options) {  //searchStr : World , replace : Node.js
    super({ ...options })
    this.searchStr = searchStr
    this.replaceStr = replaceStr
    this.tail = '' //이전 chunk의 끝 부분을 저장
  }
  _transform(chunk, _encoding, cb) {
    const pieces = (this.tail + chunk).split(this.searchStr) // 1
    // console.log('pieces ' , pieces)
    const lastPiece = pieces[pieces.length - 1] // 2
    const tailLen = this.searchStr.length - 1 
    this.tail = lastPiece.slice(-tailLen) //문자열 끝에서 tail이 될 길이만큼만 가져옴. (lo  W)저장됨. 이건 다음 청크인 olrd와 만나면 wolrd됨. 
    // console.log('tail : ' , this.tail)
    pieces[pieces.length - 1] = lastPiece.slice(0, -tailLen) //tail 제외한 부분만 pieces에 저장(Hel)
    this.push(pieces.join(this.replaceStr)) // 3 //(Hel.join(Node.js))라 요소가 하나라 그냥 Hel만 push됨
    cb()
  }
  _flush(cb) {
    this.push(this.tail)
    cb()
  }
}

// _transform -> stream에 새로운 data가 쓰여질 때마다 내부적으로 자동 호출됨
// Stream.write('data') 거나 , readable stream을 pipe()로 연결하면 들어온 데이터 조각(chunk)처리를 위해 _transform실행

//_flush -> .end()가 호출될 때 딱 한번 호출