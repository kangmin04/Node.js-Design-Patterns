//main1,2는 experimental features기에 warning이 뜸 
//manaully read  후 parsing하는 기본적 방법 
import {readFile} from 'node:fs/promises'
import { join } from 'node:path' 

const jsonPath = join(import.meta.dirname , 'data.json'); 
try{
    const dataRaw = await readFile(jsonPath);
    const jsonData = JSON.parse(dataRaw); 
    console.log(jsonData);
}catch(err){
    console.log(err); 
}
// console.log("dirname : " , import.meta.dirname , "\njsonPath : " , jsonPath);
