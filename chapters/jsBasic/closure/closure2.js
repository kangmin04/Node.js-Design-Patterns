const counter = (function(){
    let num = 0 ; 

    return {
        inc(){
            return ++num; 
        } , 
        dec(){
            return num > 0 ? --num : 0
        }
    }
}());

console.log(counter.inc()); 
console.log(counter.inc()); 
console.log(counter.inc()); 
console.log(counter.dec()); 
console.log(counter.dec()); 
console.log(counter.dec()); 
console.log(counter.dec()); 
