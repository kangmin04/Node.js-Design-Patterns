const pAll = (...list)=> {
    const promise = []; 
    let counter = 0 ; 
    return new Promise((resolve , reject) => {
      for(let i = 0 ; i < list.length ; i++){
        Promise.resolve(list[i]).then( (res) => {
            promise[i] = res ; //어차피 res는 then내부 -> 이미 완료된 이후 작업이므로 await해도 의미없음 
            counter+=1;  
        //마찬가지로 체크 로직또한 프로미스가 완료된 시점인 then 내에서 체크 되어야 ㅎㅁ. 
        if(counter === list.length){
            resolve(promise) //상태 결정이기에 굳이 return할 필요 없음 . 
        }
        }).catch(err => reject(err))
        //for 내라고 여기서 체크 하다가는 .... 안됨. 이땐 프로밋가 실행이 안된거기에 counter은 0이다. 

      }
}

    
)}

const p1 = new Promise((resolve , reject) => {
    resolve(1)
})
const p2 = new Promise((resolve , reject) => {
    setTimeout(() => {
        resolve(2)
    }, 1000)
    
})
const p3 = new Promise((resolve , reject) => {
    // reject('reject!! donedone')
     resolve(3)
})
const p4 = new Promise((resolve , reject) => {
    setTimeout( () => resolve(4) , 2000)
    
})

pAll(p1,p2,p3,p4 , 5).then((res) => {
    console.log(res)
}).catch(err => console.log(err))