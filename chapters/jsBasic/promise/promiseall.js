const req1 = () => new Promise(resolve => setTimeout(() => resolve(1) , 1000))


const req2 = () => 
    new Promise(resolve => setTimeout(() => resolve(2) , 1000))


const req3 = () => 
    new Promise(resolve => setTimeout(() => resolve(3) , 1000))



// const res = [] ; 
// req1()
//     .then(data => {res.push(data)
//         return req2(); 
//     })
//     .then(d => {
//         res.push(d); 
//         return req3() ;
//     })
//     .then(d => {
//         res.push(d); 
//         console.log(res); 
//     })
//     .catch(console.error);  

Promise.all([req1(),req2(),req3()]) //
    .then(console.log)
    .catch(console.error)