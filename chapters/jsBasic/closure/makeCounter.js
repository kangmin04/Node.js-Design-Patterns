function makeCounter(aux){
    let counter = 0 ; 

    return function(){
        counter = aux(counter); 
        return counter; 
    }
}

function increase(n){
    return n + 1 ; 
}

function decrease(n){
    return n - 1 ; 

}

//각 함수 호출 할 때마다 새로운 makeCounter 함수 실컨이 생성됨.  -> 독립된 렉시컬 환경 가짐 
//counter 증감 공유 안됨. 공유하려면 makeCounter을 한번만 호출해야..... 

 //increaser엔 makecounter 렉시컬 환경을 상위 스코프로 참조함 
 //makeCounter은 종료되지만 , makeCounter 실컨의 렉시컬환경은 Environment 내부슬롯에서 참조됨
const increaser = makeCounter(increase); 

//decreaser도 마찬가지로 생김 
const decreaser = makeCounter(decrease)

console.log(increaser()); 
console.log(increaser()); 
console.log(increaser()); 

console.log(decreaser()); 
console.log(decreaser()); 
