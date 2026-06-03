import { concatFiles } from "./concat-files.mjs";
try{
    await concatFiles( process.argv[2] , process.argv.slice(3)) // promise return
}catch(err){
    console.log(err); 
}
   