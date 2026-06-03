

async function a(){
    setTimeout(() => {
        console.log('where is this')
    } , 1)
    await fetch('http://naver.com' , {
        method : 'HEAD' , 
        timeout : 5000 , 
        signal : AbortSignal.timeout(5000) , 
    })   
    console.log('it is in async and a is')
   
  }

console.log('invoke A'); 
a(); 
for(let i=0 ; i < 100 ; i++){
    console.log('after invoke A' , i)
}