import {readdir , readFile} from 'node:fs'

function recursiveFind(dir , keyword , cb){

    const results = []; 
    
    readdir(dir , (err , files) => {
        if(err) return cb(err); 
        let taskLen = files.length; 
        
        for(const file of files){
            const filePath = `${dir}/${file}`; 
           
            readFile(filePath , 'utf-8' , (err , data) => {
                taskLen--;
                if(err) return cb(err); 
                // return data.includes(keyword); 
                if(data.includes(keyword)){
                     results.push(file); 
                    }

                if(taskLen === 0) {
                        return cb(null , results); 
                    }
                })

            // if(matchWord(filePath , keyword)){
            //     results.push(file); 
            // }



        }

    })

    function matchWord(currentPath , keyword){  
        readFile(currentPath , 'utf-8' , (err , data) => {
            if(err) return cb(err); 
            // return data.includes(keyword); 
            if(data.includes(keyword)){
                results.push(currentPath); 
            }
    })
    }
        
}


recursiveFind('./' , 'bored' , (err,result) => {
    if(err) console.log(err); 
    console.log(result); 
})