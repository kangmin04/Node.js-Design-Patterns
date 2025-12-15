import {readFile , writeFile} from 'node:fs'

//현재 고민 . concatFiles 함수 인자로 cb과 rest parameter이 와야하는데 , 둘다 가장 마지막 인자로 위치해야 하는 것들이다., 문제 !!! 
//이걸 해결 하는 방법 -> 모든 내용 (파일 , cb , dest)을 rest parameter 로 받고, 이걸 함수 내에서 pop해서 사용하는 거다.. 즉 받아오는 인자 순서가 중요해짐 

function concatFiles(...args){ 
    const cb = args.pop(); 
    const dest = args.pop(); 
    const srcs = args ;
    
    let fileData = ''; 

    function iterator(index){
        if(index === srcs.length ){
            writeFile(dest , fileData , (err) => {
                if(err) return console.log(err); 
                console.log('dest made! '); 
            })
            return cb(); 
        }
        readFile(srcs[index] , (err , data) => {
            if(err) {            
                return cb(err); 
            }
           
            fileData+=data.toString();
            iterator(index+1);   // iterator(index++) 시 현재 0인 index를 그대로 다시 iterator에 넣는셈.. 

    })
    }
    iterator(0);        
}

const args = ['text1.txt' , 'text2.txt' , 'text3.txt' , 'dest.txt' , (err) => {
    if(err){
        console.log(err); 
        process.exit(1);
    }

    console.log('DONE');
}]
concatFiles(...args); 
//기존처럼 concatFiles(args); 면 

//function concatFiles(...args) 에 정의된건 여기로 전달되는 개별 인자 모든걸 모아서 배열 하나로 만드는 것. 
// -> args란 배열 인자 하나를 전달히기에 , 실제 concatFiles 내에서 args 인자는 2차원 배열이 됨. [[args 내용]]