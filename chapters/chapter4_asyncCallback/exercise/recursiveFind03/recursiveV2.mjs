import {readdir , readFile , stat} from 'node:fs'
import {join} from 'node:path'

function recursiveFind(dir , keyword , cb){
    const concurrency = 2; 
    const tasks = [dir]; 
    const results = []; 
    let running = 0 ; 
    
    function next(){

    if(tasks.length === 0 && running === 0 ){
        return cb(null , results); 
    }
        //실행 중 작업이 제한보다작고 , 할 일이 남아있을 떄 
        while(running < concurrency && tasks.length > 0 ){
            const task = tasks.shift(); 
            processPath(task); 
        }
          
    }

    function processPath(path){
        running ++ ; 

        stat(path , (err , stats) => {
            if(err) {
                running --; 
                return cb(err)
            }
            if(stats.isDirectory()){
                readdir(path , (err , files) => {
                    if(err) return complete(err); 
                    // 찾은 파일들 -> queue에다가 넣어서 작업하기. 
                    files.forEach((file) => {
                        tasks.push(join(path , file)); 
                    }) //= tasks.push(...files.map(file) => join(path,file))
                    running --; //디렉토리 작업 완료 
                    next(); 
                })
            }else{
                //경로 파일
                readFile(path , 'utf-8' , (err , data) => {
                      // --- 의도적인 에러 주입 --- 
          if (path.endsWith('test1.txt')) {
            const artificialError = new Error(`인위적으로 발생시킨 에러: ${path}`);
            return cb(artificialError);
          }
          // -------------------------
                    if(err) return complete(err); 
                    if(data.includes(keyword)){
                        results.push(path); 
                    }

                    running --; //파일 작업 완료 
                    next(); 
                })
            }
        })
    }
    next(); 
}


recursiveFind('./' , 'bored' , (err,result) => {
    if(err) {
        return console.log(err); 
        
    }
    console.log(result); 
})