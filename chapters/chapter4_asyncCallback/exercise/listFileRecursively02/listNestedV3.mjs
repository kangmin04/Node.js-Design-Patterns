import {readdir} from 'node:fs'
import {join} from 'node:path'

function listNestedFiles(dir, cb) {
  const results = [];
  let pending = 0;
  let done = false;

  //race condition 시 발생 가능한 "에러가 두번 발생하는 경우" 를 방지하고자 ! 
  //A,B가 둘다 잘못된 경로로 readdir 실행. A가 먼저 finish(err)함
  //done은 false 이므로  done = true로 바꾸고 cb(err) 실행됨
  //이때 B도 실패하고 readdir 시 , finish 호출되고 done이 true 라  밑의 cb(err)가 호출 안되고 바로 리턴됨 ! 
  //이게 없었다면 B도 cb(err)로 에러가 두번 호출된다. .. 큰일 

  function finish(err) {
    if (done) return;
    done = true;
    cb(err, results);
  }

  function visit(currentPath) {
    pending++; // new asynchronous work added ! 

    readdir(currentPath, { withFileTypes: true }, (err, entries) => {
      if (err) return finish(err);

      entries.forEach(entry => {
        const fullPath = join(currentPath, entry.name);

        if (entry.isDirectory()) {
          visit(fullPath);
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      });

      pending--; //현재 비동기 작업 종료 
      if (pending === 0) {
        finish(null);
      }
    });
  }

  visit(dir);
}


listNestedFiles('/home/user/node-design-system/chapters/chapter4_asyncCallback/exercise' , (err , result) => {
    if(err){
        console.log(err); 
        process.exit(1); 
    }
    console.log('결과 : ' , result); 
});
