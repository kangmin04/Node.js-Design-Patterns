// const pro = new Promise((resolve, reject) => {
//     console.log('promise '); 
    
//     setTimeout(() => {
//         resolve(1);
//     }, 2000)
//     console.log('sybnc')
// })


// pro.then((res) => {
//     console.log(pro);
//     console.log(res);
// })


let promise = Promise.resolve(); 

promise=promise.then(() => {
    console.log('promise');
})

pr
