const Person = '' ; 

{
    console.log(Person);  //ReferenceError: Cannot access 'Person' before initialization

    class Person {} //클래스도 호이스팅이 일어난다 ! 
}