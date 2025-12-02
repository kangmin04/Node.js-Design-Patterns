// //'await'를 사용 시 fs/promises에서 가져옴. 
// import { readFile } from 'node:fs/promises'; 


// const readJSON = async (filename) => {
//     let fileContent;
//     try {
       
//         fileContent = await readFile(filename, { encoding: 'utf-8' });
//     } catch (err) {
//         console.error("파일 읽기 에러:", err);
//         return; 
//     }

//     try {
//         const jsonData = JSON.parse(fileContent);
//         console.log("성공적으로 JSON을 파싱했습니다:", jsonData);
//     } catch (err) {
//         console.error("JSON 파싱 에러:", err);
//     }
// }

// const async1 = (err, data) => {
//     console.log('data') ; 
// }

// readJSON('data.json');



