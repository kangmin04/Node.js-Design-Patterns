import {createInterface} from 'node:readline'
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream'
const inputFile = createReadStream(process.argv[2]) // 1
const fileLines = createInterface({ // 2
  input: inputFile,
}) //얜  readable Stream이 아님


// try{
//     await pipeline(fileLines ,  //pipe는 스트림 규격 따르는 객체들과 작동
//         process.stdout)
// }catch(err){
//     console.error(err)
// }

//readline.interface는 스트림을 소비하는 객체. 
//input으로 들어온 스트림데이터를 읽어서 한줄씩 파싱 후 line 이벤트 발생시키거나 , 비동기 반복자 (Async iterator)로 동작
//데이터 파이핑 기능은 없다. 
try {
    // fileLines에서 한 줄씩 비동기적으로 가져와 'line' 변수에 담습니다.
    for await (const line of fileLines) {
      // 가져온 한 줄을 표준 출력(stdout)에 씁니다.
      process.stdout.write(line + '\n');
    }
  } catch (err) {
    console.error(err);
  }