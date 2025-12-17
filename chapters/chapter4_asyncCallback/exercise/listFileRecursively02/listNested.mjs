import {readdir} from 'node:fs'
import {join} from 'node:path'
//test

const subdirArr = []; 

function listNestedFiles(currentUrl){    
    console.log('currentUrl' , currentUrl)
    readdir(currentUrl ,{withFileTypes : true} , (err , files) => {
        if(err) return console.error(err); 
        //files -> array of subdirectory. 
        let taskLength = files.length; 
        let taskDone = 0 ; 
        let isRoot = 0 ; 
        for(const file of files){
            taskDone+=1; 
            // console.log('Every FIle we Search : ' , file.name)

             if(taskDone === taskLength){
                //done..... 
                return console.log(subdirArr)
             }

            if(!file.isDirectory()){
                // console.log(`${file.name} is not directory`);
               
            }else{

            subdirArr.push(file.name);     
            console.log(`${file.name} pushed in arr`)
            listNestedFiles(makePath(file.parentPath , file.name))
            }
            
        }

        
        
    })
}

listNestedFiles('/home/user/node-design-system/chapters/chapter4_asyncCallback'); 

function makePath(currentUrl , subdirectory){
    return join(currentUrl , subdirectory); 
}