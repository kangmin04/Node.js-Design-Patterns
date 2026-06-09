const A_CHAR_CODE = 'A'.charCodeAt(0) // 65
const Z_CHAR_CODE = 'Z'.charCodeAt(0) // 90

function createAlphabetIterator() {
  let currCode = A_CHAR_CODE

  return {
    next() {
      const currChar = String.fromCodePoint(currCode) /* alphabet char return */
      if (currCode > Z_CHAR_CODE) {
        return { done: true } // for of 종료 조건 
      }

      currCode++
      return { value: currChar, done: false }
    },
    /* 이터러블(Iterable): 이터레이터를 반환하는 [Symbol.iterator] 메서드를 가진 객체 */
    /* 이터레이터를 이터러블로 만들기위해 이터레이터를 반환하는  [Symbol.iterator] 메서드를 정의함 ->  for of 로 사용 가능  */
    [Symbol.iterator](){
        return this
    }  
  }
}


for(const letter of  createAlphabetIterator()){
    console.log(letter)
}

const letters = [...createAlphabetIterator()]
console.log(letters)
/*
[
  'A', 'B', 'C', 'D', 'E', 'F',
  'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R',
  'S', 'T', 'U', 'V', 'W', 'X',
  'Y', 'Z'
]
*/

/* 저수준 방식의 이터러블 사용법!  */
// const iterator = createAlphabetIterator()

// let iterationResult = iterator.next()

// while (!iterationResult.done) {
//   console.log(iterationResult.value)
//   iterationResult = iterator.next()
// }