function createPerson(name) {
    const privateProperties = {}
  
    const person = {
      setName(name) {
        if (!name) {
          throw new Error('A person must have a name')
        }
        privateProperties.name = name
      },
      getName() {
        return privateProperties.name
      },
    }
  
    person.setName(name)
    return person
  }
  
  const person = createPerson('James Joyce')
  
  console.log(person.getName(), person)

  const me = createPerson('Alice');
console.log(me.getName()); // "Alice"

// 외부에서 비공개 데이터에 직접 접근 시도 -> 실패!
console.log(me.privateProperties); // undefined

// 유효성 검사 강제
me.setName('Bob');
console.log(me.getName()); // "Bob"

try {
  // 공개 인터페이스(setName)를 통해서만 데이터를 바꿀 수 있으며,
  // 이 인터페이스는 우리가 정한 규칙(이름은 비어있을 수 없다)을 강제합니다.
  me.setName('');
} catch (e) {
  console.error(e.message); // "A person must have a name"
}