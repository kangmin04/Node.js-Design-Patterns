// function* g1() {
//     yield* [2,3];
//     yield* "45";
//   }
  
//   function* g2() {
//     yield 1;
//     yield* g1();
//     yield 6;
//   }
  
//   var iterator = g2();
  
//   console.log(iterator.next()); // { value: 1, done: false }
//   console.log(iterator.next()); // { value: 2, done: false }
//   console.log(iterator.next()); // { value: 3, done: false }
//   console.log(iterator.next()); // { value: 4, done: false }
//   console.log(iterator.next()); // { value: 5, done: false }
//   console.log(iterator.next()); // { value: undefined, done: true }

const array = [1, 2, 3, 4, 5];

function* print(arr){
    yield* arr
}
const printeGenerator = print(array); 
for (const val of printeGenerator){
    console.log(val)
}
/* 
    제너레이터는 일회용. 
    printGenerator은 이터레이터 -> state를 저장함
*/
const data = [...printeGenerator]
console.log(data)


