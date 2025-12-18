
import { readdir, readFile, stat } from 'node:fs';
import { join } from 'node:path';

function recursiveFind(dir, keyword, cb) {
  const concurrency = 2;
  const tasks = [dir];
  const results = [];
  let running = 0;
  let done = false;

  // 최종 콜백은 한 번만 호출되도록 래핑
  const finish = (err) => {
    if (done) return;
    done = true;
    cb(err, results); 
  };

  function next() {
    // 1. 모든 작업이 완료되었는지 확인 (가장 중요한 부분)
    if (tasks.length === 0 && running === 0) {
      return finish(null); // 성공적으로 모든 작업 완료
    }

    // 2. 동시성 제어에 따라 새로운 작업 시작
    while (running < concurrency && tasks.length > 0) {
      const path = tasks.shift();
      processPath(path);
    }
  }

  function processPath(path) {
    running++;

    stat(path, (err, stats) => {
      if (err) {
        return finish(err); // stat 에러는 즉시 종료
      }

      if (stats.isDirectory()) {
        readdir(path, 'utf-8', (err, files) => {
          if (err) {
            return finish(err);
          }
          tasks.push(...files.map(file => join(path, file)));
         
          running--;
          next();
        });
      } else {
        readFile(path, 'utf-8', (err, data) => {
        //   // --- 의도적인 에러 주입 --- 
        //   if (path.endsWith('test1.txt')) {
        //     const artificialError = new Error(`인위적으로 발생시킨 에러: ${path}`);
        //     return finish(artificialError);
        //   }
        //   // -------------------------

          if (err) {
            // 실제 파일 읽기 에러가 발생해도 종료
            return finish(err);
          }

          if (data.includes(keyword)) {
            results.push(path);
          }
          running--;
          next();
        });
      }
    });
  }

  next(); // 시작
}

// --- 실행 --- 
console.log('Running recursiveFind with error injection...');
recursiveFind('../', 'bored', (err, result) => {
  if (err) {
    console.error('의도된 에러가 정상적으로 발생했습니다:');
    return console.error(err);
  }
  console.log('찾은 파일:', result);
});
