function a(){
    console.log(this)
}

const obj = {
    result : 5
    ,
    print(){
        console.log('this : ',  this);  /* this: obj */
        console.log(this.result);
    }
}



const test = {
    prop: 42,
    func: function () {
        console.log(this) // this refers to test object
      return this.prop;
    },
  };
  
  console.log(test.func());