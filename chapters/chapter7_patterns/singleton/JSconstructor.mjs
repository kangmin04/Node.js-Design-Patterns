/*
    JS 객체는 자신의 프로토타입에 대한 정보를 가지고있고
    여기엔 자신을 만든 생성자에 대한 참조가 포함됨
*/

class Person {
    constructor(name) {
      this.name = name;
    }
  }
  
  const me = new Person('kim');
  
  // me 인스턴스의 constructor 속성은 Person 클래스 자체를 가리킵니다.
  console.log(me.constructor === Person); // true
  
  // 따라서, 아래 두 코드는 완전히 동일하게 동작합니다.
  const anotherMe1 = new Person('park');
  const anotherMe2 = new me.constructor('park'); // me.constructor가 Person 클래스이므로
  
  console.log(anotherMe1); // Person { name: 'park' }
  console.log(anotherMe2); // Person { name: 'park' }
  