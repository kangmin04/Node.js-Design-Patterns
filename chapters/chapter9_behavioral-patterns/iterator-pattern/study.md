데이터 내부 구조를 숨기고 요소를 순회하게하는 공통된 방법을 제공함 

Infinite iterator - 무조건 종료될 때 done : true할 필요없음. 
끝이없는 데이터 스트림 만들수도있다. 
피보나치나 pi계산하는 등등... 

 stateful - 
 클로져 OR 인스턴스 변수
다음처럼 currcode를 함수내부에서 변수로 정의하여 외부에서 조작 못하게 할수있음 . 단점은 디버깅 시 내부 상태 보기 어려움 
OR 객체의 속성으로 this.current 처럼 저장해도 됨 

function createAlphabetIterator() {
  let currCode = A_CHAR_CODE

  return {
    next() {
      const currChar = String.fromCodePoint(currCode)
`~~}}
}

이터레이터 소바
1. 고수준 - for of , ... (전개연산자) 등 사용 
2. 저수준 - 직접 iterator.next() 호출하고 done여부 체크 



1. 이터러블 프로토콜(Iterable Protocol)이란?
이터러블 프로토콜은 객체가 반복 가능한 구조를 가질 수 있도록 정의된 표준 약속입니다.

이터러블(Iterable): 이터레이터를 반환하는 [Symbol.iterator] 메서드를 가진 객체를 말합니다.

구현 방법: 객체 내부에 @@iterator라고 불리는 특수한 심볼 메서드인 Symbol.iterator를 구현해야 합니다.

class Iterable {
  //다른 메서드들 
  [Symbol.iterator]() {
    //iterator 리턴함
  }
}


목적: 배열(Array), 세트(Set), 맵(Map)과 같은 표준 내장 객체뿐만 아니라, 사용자가 직접 만든 객체(예: 파일 시스템, 데이터베이스 결과 세트)도 일관된 방식으로 순회할 수 있게 합니다.

객체가 이터러블 프로토콜을 준수하면 JS엔진은 해당 객체를 반복 ㄱㄴ한 대상으로 인지함 

구현된 이터레이터 내부에서 메서드로 Symbol.iterator 추가하고 스스로를 리턴한다면 -> 이터러블로 사용가능 -> for of , ... 에서 고수준으로 사용가능 ! 
이터레이터에 이터러블 구현하는건 권장되는 관행! 
next 직접 호출로 미세하게 제어 OR for of  둘다 가능함. -> Interoperability 극대화

 -----------------------
이터러블 매트릭스 예제
class Matrix{
   [Symbol.iterator]() {
      let nextRow = 0
      let nextCol = 0
  
      return {
        next: () => {
          if (nextRow === this.data.length) {
            return { done: true }
          }
  
          const currVal = this.data[nextRow][nextCol]
  
          if (nextCol === this.data[nextRow].length - 1) {
            nextRow++
            nextCol = 0
          } else {
            nextCol++
          }
  
          return { value: currVal }
        },
      }
   }
}

const mat = new Matrix();
const iterator = mat[Symbol.iterator]()  이렇게 symbol.iterator 메서드를 가져와서 return next() 함수 가능





/* Iterator prototype 상속 */

- instanceof Iterator: 객체가 이터레이터인지 런타임에 쉽게 확인할 수 있습니다.
- 상속된 유틸리티: map(), filter(), take(), drop() 등 강력한 헬퍼 메서드를 사용할 수 있습니다.
- 이터러블 이터레이터: Iterator를 상속받으면 자동으로 [Symbol.iterator]가 구현되어 for...of나 전개 연산자(...)를 즉시 사용할 수 있습니다. -
( - Iterator prototype은 iterable protocol을 뒤에서 구현해줌 )




**제너레이터
  /*
    generator function invoke는 내부를 즉시 실행하지않음. 
    generator obj 리턴. -> 얜 이터레이터이자 이터러블임. 
    next() 호출 시 yield 나 return 까지만 실행. 
    yield x 는 {value : x , done : false} 리턴
    return x는 {value : x , done : true} 리턴

    for ..of 는 yield 되는거만 출력 -> return 은 출력안함. 
  */

제너레이터는 양방향 통신 가능 
외부에서 내부로 next(인자) 넣어서 전달됨. 


generator-prac에서처럼 
yield* 는 다른 제너레이터 OR 이터러블에게 실행을 위임함. 
즉, 제너레이터면 해당 제너레이터를 실행하고 
이터러블이면 해당 이러터블이 모두 소진되게끔 실행한다. 


js 엔진은 function* 만나면 이터러블을 위한 작업을 간편하게 처리해줌. 

-------------------------------------

현재 Node에선 Iterator 헬퍼 메서드 적용이 안됨. 
아직 제한적인 사용만 가능 
--> 모든 이터러블 객체가 가지는 [Symbol.iterator]()메서드를 호출해서 이터레이터로 사용 가능. 

 // const urlsIterator = Iterator.from(this.#urls)
    const urlsIterator = this.#urls[Symbol.iterator]()
    
-------------------------------------
async iterator
- http , db등 async 작업 위해서 사용 
[Symbol.asyncIterator]() {
    const urlsIterator = Iterator.from(this.#urls)

    return {
      async next() {
      }}
}
내부 클래스에 해당 메서드 정의 후 async next() 설정 -> next()는 프로미스를 리턴함

순회 시 
for await (const value of iterable){
  console.log(value)
} 이렇게 사용함. 
이건 사실 다음 내용의 축약형임. ! 

const asyncIterator = iterable[Symbol.asyncIterator](); 
let iterationResult = await asyncIterator.next();  //next는 async으로 정의됨
while(!iterationResult.done){
  console.log(iterationResult.value)
  iterationResult = await asyncIterator.next();

}

----------------------------
비동기 제너레이터 
async function* ~ 

호출 시 비동기 제너레이터 객체 반환. 이 객체는 비동기 이터레이터이자 비동기 이터러블 
수동으로 next() done: , value : 조건 붙여줄 필요없음 . 
yield가 상태 저장하고 리턴도 가능. 


쉽게 말해 **비동기 제너레이터(Async Generator)는 비동기 이터레이터(Async Iterator)를 아주 쉽게 만들 수 있게 해주는 특별한 문법(syntactic sugar)**입니다.

비동기 이터레이터 (Async Iterator - The "Manual" Way):

직접 구현: next() 메소드를 직접 async로 만들고, 그 안에서 Promise를 반환하도록 수동으로 코드를 작성해야 합니다.
객체 구조: { async next() { ... } } 와 같은 객체 구조를 명시적으로 만들고 반환해야 합니다.
checkurl.mjs 파일의 CheckUrls 클래스가 바로 비동기 이터레이터를 직접 구현한 예시입니다. next() 메소드 내에서 await fetch() 같은 비동기 작업을 처리하고 있죠.



비동기 제너레이터 (Async Generator - The "Easy" Way):

자동화: async function* 키워드를 사용하면, 자바스크립트 엔진이 알아서 Promise를 반환하는 next() 메소드를 가진 비동기 이터레이터를 만들어줍니다.
yield 사용: 우리는 그저 yield 키워드를 사용해 값을 내보내기만 하면 됩니다. 비동기 작업이 필요하면 const result = await someAsyncWork() 처럼 자연스럽게 await를 사용할 수 있습니다.
복잡한 상태 관리(done 플래그 등)나 next 구조를 직접 만들 필요가 없어 코드가 훨씬 간결하고 직관적입니다.
결론: 둘 다 비동기 이터레이션 프로토콜을 따르는 객체를 만듭니다. 하지만 제너레이터는 그 과정을 훨씬 편리하게 해주는 "고급 도구"

--------------------------------
동기 VS 비동기 
[Symbol.iterator]: 동기 이터러블(e.g., Array, String, Map)이 가지고 있는 표준 심볼입니다. 이 메소드를 호출하면 동기 이터레이터가 반환됩니다. 이 이터레이터의 next()는 { value, done } 객체를 즉시 반환합니다.
[Symbol.asyncIterator]: 비동기 이터러블이 가지고 있는 심볼입니다. 이 메소드를 호출하면 비동기 이터레이터가 반환됩니다. 이 이터레이터의 next()는 { value, done } 객체를 담은 Promise를 반환합니다.



-------------------
스트림 , 비동기 이터레이터 

- 둘다 비동기 리소스의 데이터를 한꺼번에 메모리에 올리는게 아닌, 
chunk(piece)단위로 처리함 

- 실제로 node의 readable stream은 @@asyncIterator 구현하고있음 
즉, 모든 readable stream은 비동기 이터러블 

- for await of 로 스트림 데이터 처리 가능 

- import split from 'split2' // v4.2.0

const stream = process.stdin.pipe(split())

for await (const line of stream) {
  console.log(`You wrote: ${line}`)
}


- 데이터 수신 방식 2가지.  
  1. Push 방식
    - data가 emit될 때마다 , myEmitter.on('ping') 은 해당 이벤트 발생하면 처리함. 
    - myEmitter.on('ping', (data) => {
    console.log('[PUSH]', data);
});
  
  2. Pull 방식
    - 데이터 처리 가능하게끔 준비됐을 때 데이터를 요청해서 가져오는 것. for.. of 방식! 
    - async function listen(){
    const eventIterator = on(myEmitter, 'ping');
    for await (const [data] of eventIterator){
        console.log('[PULL] ping received : ' , data.timestamp)
    }
}
    - 콜백 지옥에서 벗어나서 async await 작성 가능 

---------------------------------


for ..of 원리 
