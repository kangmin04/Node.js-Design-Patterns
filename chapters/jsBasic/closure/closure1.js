const increase = (function(num){
    let count = 0 ; 
    console.log('num: ' , num)  
    return function(){
        
        return ++count;

    }
}(3))

console.log(increase()); 
console.log(increase()); 
console.log(increase()); 

// 코드 실행 시 즉시 실행함수호출 
// -> return function(return ++count){}는 즉시 실행함수가 실행 중 실컨일 때 평가됨. 즉 , Environemnt에 즉시 실햄함수를 참조하며 상위 스코프는 즉시실행함수임
// -> 즉시실행함수는 소멸되면서 실컨 스택에서 pop되나 , increase 변수에 여전히 참조되기에 렉시컬환경이 안사라짐
// -> increase시 count는 private 변수처럼 작동하며 즉시실행함수 처음에만 초기화될것이고 , increase를 하여 증가시킬수있음