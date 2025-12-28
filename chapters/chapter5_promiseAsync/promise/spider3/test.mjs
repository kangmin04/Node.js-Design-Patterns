
/**
 * 가상의 비동기 작업 처리 함수입니다.
 * 작업을 처리하고, 결과로 새로운 하위 작업 목록을 반환할 수 있습니다.
 * @param {object} task - 처리할 작업 객체.
 * @returns {Promise<object>} 처리 결과를 담은 프로미스.
 */
function runTask(task) {
    console.log(`처리 중: ${task.name}`);
    return new Promise(resolve => {
      setTimeout(() => {
        // 60% 확률로 하위 작업이 생성된다고 가정
        const hasSubtasks = Math.random() > 0.4;
        const result = {
          processed: task.name,
          subTasks: [],
        };
  
        if (hasSubtasks) {
          const subTaskCount = Math.floor(Math.random() * 2) + 1; // 1개 또는 2개의 하위 작업 생성
          for (let i = 0; i < subTaskCount; i++) {
            result.subTasks.push({ name: `${task.name}의 하위작업-${i + 1}` });
          }
          console.log(` -> 완료 '${task.name}'. 하위 작업 ${result.subTasks.length}개 발견.`);
        } else {
          console.log(` -> 완료 '${task.name}'. 하위 작업 없음.`);
        }
        
        resolve(result);
      }, 500); // 0.5초의 비동기 딜레이
    });
  }
  
  /**
   * 작업을 재귀적으로 처리하되, 최대 깊이를 제한합니다.
   * spiderLinks 함수와 동일한 패턴을 사용합니다.
   * @param {object} task - 처리할 작업.
   * @param {number} maxDepth - 최대 재귀 깊이.
   */
  function processTasksRecursive(task, maxDepth) {
    // 1. 재귀 종료 조건 (Base Case): 최대 깊이에 도달하면, 더 이상 진행하지 않고 성공적으로 완료된 프로미스를 반환합니다.
    if (maxDepth === 0) {
      console.log(`최대 깊이 도달. '${task.name}'의 하위 작업은 더 이상 처리하지 않습니다.`);
      return Promise.resolve();
    }
  
    // 현재 작업을 비동기로 실행하고, 결과를 받습니다.
    return runTask(task)
      .then(result => {
        const subTasks = result.subTasks;
        if (!subTasks || subTasks.length === 0) {
          // 이 분기에서 더 이상 처리할 하위 작업이 없으면 성공적으로 종료합니다.
          return Promise.resolve();
        }
  
        // 2. 재귀 단계: 각 하위 작업에 대해 재귀적으로 함수를 호출하고, 그 결과로 생성된 프로미스들을 배열로 만듭니다.
        const subTaskPromises = subTasks.map(subTask =>
          processTasksRecursive(subTask, maxDepth - 1)
        );
  
        // 3. 동시성 처리: 모든 하위 작업 프로미스가 완료될 때까지 기다립니다.
        return Promise.all(subTaskPromises);
      });
  }
  
  
  // --- 예제 실행 ---
  console.log('--- 작업 처리 시스템 시작 ---');
  const initialTask = { name: '최초 작업' };
  const initialDepth = 2;
  
  processTasksRecursive(initialTask, initialDepth)
    .then(() => {
      console.log('\n--- 모든 작업이 성공적으로 완료되었습니다. ---');
    })
    .catch(err => {
      console.error('\n--- 처리 중 오류가 발생했습니다 ---', err);
    });
  