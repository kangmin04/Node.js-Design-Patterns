function asyncMap(iterable , callback , concurrency){
    return new Promise((resolve , reject) => {
        const results = [] ; 
        const iterator = iterable[Symbol.iterator](); 
        let completed = 0 ; 
        let index = 0 ; 
        //promise executor executed directly. 
        console.log('in promise');
        function next(){
            const item = iterator.next(); 
            const currentIndex = index; 

            index++; 
            if(item.done){
                return ;  
            }
            const promise = Promise.resolve(callback(item.value))
            
            promise.then((res) => {
                results[currentIndex] = res ; 
              
                completed++; 

                if(completed === iterable.length){
                    return resolve(results)
                }

                next()
            }).catch(reject)
        }
        
        
        for(let i = 0 ; i < concurrency ; i++){
            next()
        }

        console.log('outside')
        
    })
}


asyncMap([1,2,3,4] , (data) => {return data*2} , 2)
    .then((data) => console.log(data)).catch(err => console.log(err));




// .then((data) => console.log(data)).catch(err => console.log(err));



// 기존코드 및 고민 : 
// next에서 모든 비동기 로직이 이루어지고 그 결과를 next에서 리턴했으나 이러면 
// 가장 외부인 asyncMap에선 리턴이 불ㄱㄴ함......
// => 왜 주구장창 return new Promise()로 시작하는지 이해가 된다. 
// function asyncMap(iterable , callback , concurrency){

//     const results = [] ; 

//     const iterator = iterable[Symbol.iterator](); 
//     for(let i = 0 ; i < concurrency ; i++){
//         next()
//     }

//     function next(){
//         const item = iterator.next(); 
//         if(item.done){
//             return Promise.resolve(results) ; 
           
//         }

//         const promise = Promise.resolve(callback(item.value))
    
//         promise.then((res) => {
//             results.push(res)
//             next()
//         })
//     }
//     if(results.length === iterable.length){
//         return Promise.resolve(results)
//     }
    
