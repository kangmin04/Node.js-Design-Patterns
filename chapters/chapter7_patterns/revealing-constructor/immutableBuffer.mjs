const MODIFIER_NAMES = ['swap', 'write', 'fill']
export class ImmutableBuffer {
  constructor(size, executor) {
    const buffer = Buffer.alloc(size) // 1
    const modifiers = {} // 2
    for (const prop in buffer) { // buffer의 모든 객체를 순화함. 
      if (typeof buffer[prop] !== 'function') { 
        continue
      }
      //function에 대해서만 다음 로직 적용. 
      if (MODIFIER_NAMES.some(m => prop.startsWith(m))) { //하나라도 true면 true반환
        modifiers[prop] = buffer[prop].bind(buffer) // modifiers['write'] = buffer['write'].bind(buffer) -> 
        //buffer[prop]은 그냥 함수. 이게 나중에 다른 곳에서 호출되면 this가 원래의 buffer 갹체를 가리킨다고 보장. 
      } else {
        this[prop] = buffer[prop].bind(buffer) // 5
      }
    }
    executor(modifiers) // 6 생성자 마지막 함수가 호출. 
    /*
        executor은 ({write => {write(hello)}})로 구성됨. 
        
    */
  }
}