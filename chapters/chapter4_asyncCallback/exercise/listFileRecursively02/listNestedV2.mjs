import {readdir} from 'node:fs'
import {join} from 'node:path'
//test
 

function listNestedFiles(currentUrl , cb){   //cb is final one. we going to print results at the end.   
  const results = [] 
    walk(currentUrl, results , (err) => { // walk is asynchronous one -> end of walk ---> print results. 
        if(err){
            return cb(err); 
        }
        cb(null , results);
    })
}


//해당 디렉토리에서 하위 폴더만 추출함.... 우린 이걸 recursively 하게 전체를 가져올것 . 

listNestedFiles('/home/user/node-design-system/chapters/chapter4_asyncCallback/' , (err , result) => {
    if(err){
        console.log(err); 
        process.exit(1); 
    }
    console.log('결과 : ' , result); 
});


function walk(currentUrl , result, done){ // done -> err면 종료. 아니면 출력 . 
    readdir(currentUrl ,{withFileTypes : true} , (err , files) => {
        if(err) return done(err); 
        let pending = files.length ; 
        // console.log(`currentUrl : ${currentUrl}` , pending)
        if(pending === 0 ){
            console.log('pending is 0. ' , result)
            return done(null); 
        }
    
        for(const file of files){
            if(!file.isDirectory()){
               result.push(file.name);
               pending--;  
               if(pending ===0){
                return done(null)
               }
            }else{
                
                walk(makePath(file.parentPath , file.name  ) , result , () => {
                    pending--; 
                    if(pending === 0){
                        return done(null); 
                    }
                })
            }
            
        }

        
        
    })
}
function makePath(currentUrl , subdirectory){
    return join(currentUrl , subdirectory); 
}