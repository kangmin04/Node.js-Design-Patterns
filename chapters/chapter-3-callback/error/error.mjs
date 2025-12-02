import {readFile} from 'node:fs' ; 

function readJson(filename , cb){
    readFile(filename , 'utf-8' , (err , data) => {
        let parsed ; 
        if(err){
            return cb(err) //error를 throw 하지않고 상위 로직에 전달 !   
        }
    try{
        parsed = JSON.parse(data);  //trycatch가 syntaxError 잡아서 cv(err)통해서 콜백으로 전달. 
        //에러 객체 출력되고 프로그램은 종료 안됨. 
    }catch(err){
        return cb(err)
    }
    return cb(null , parsed)

})}


// readJson("data.json" , console.log); 
// readJsonThrows("data.json" , console.log); 

function readJsonThrows(filename , cb){
    readFile(filename , 'utf-8' , (err , data) => {
        if(err){
            return cb(err) //error를 throw 하지않고 상위 로직에 전달 !   
        }
        cb(null , JSON.parse(data)); //trycatch가 없기애 에러 안잡히고 , NODE.js 런타임으로 전파됨. 
        //프로세스 즉시 종료시키고 에러 발생 지점의 error trace 출력
    })}




try {
    readJsonThrows("data.json" , (err) => {
            console.log('error 입니다: ' , err)
        }); 
    // readJson("data.json" , (err) => {
    //     console.log('error 입니다: ' , err)
    // }); 
}catch(err){
    console.log('this will not print')
}


process.on('uncaughtException' , (err) => {
    console.error("this will catch at last the JSON parsing : " , err.message); 
    process.exit(1)
})