class Person {
    constructor(name,address) {
        this.name = name;
        this.address = address ; 
    } //return {} 하면 this가 무시됨
}

const me = new Person('kim' , 'daegu') ;  //new 연산자로 클래스 호출 시 인스턴스 반환
console.log(me); 

