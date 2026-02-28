function* fruitGenerator() {
    yield 'peach'
    yield 'watermelon'
    return 'summer'
  }
  
  const fruitGeneratorObj = fruitGenerator()
  /*
    generator function invoke는 내부를 즉시 실행하지않음. 
    generator obj 리턴. -> 얜 이터레이터이자 이터러블임. 
    next() 호출 시 yield 나 return 까지만 실행. 
    yield x 는 {value : x , done : false} 리턴
    return x는 {value : x , done : true} 리턴

    for ..of 는 yield 되는거만 출력 -> return 은 출력안함. 
  */

    /*
        첫번째 next 호출 -> yield peach; 를 만나면 엔진은 
        { value: 'peach', done: false } 객체를 생성
         이 객체를 next()의 반환값으로 외부로 보냄. 
    */
  console.log(fruitGeneratorObj.next())
  console.log(fruitGeneratorObj.next())
  console.log(fruitGeneratorObj.next())
  
  console.log('Using for...of:')
  
  for (const fruit of fruitGenerator()) {
    console.log(fruit)
  }