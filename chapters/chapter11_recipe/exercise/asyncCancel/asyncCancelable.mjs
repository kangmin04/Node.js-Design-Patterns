// 취소 시 발생시킬 커스텀 에러
class CancelationError extends Error {
    constructor(message = 'Operation was canceled') {
      super(message);
      this.name = 'CancelationError';
    }
  }
  
  export function createAsyncCancelable(generatorFn) {
    return function(...args) {
      const generator = generatorFn(...args);
      let currentChild = null; // 현재 대기 중인 자식 cancelable 객체를 추적
      let isCanceled = false;
  
      const promise = new Promise((resolve, reject) => {
        // 제너레이터를 한 단계씩 진행시키는 내부 함수
        function step(verb, arg) {
          if (isCanceled) return; // 이미 취소되었다면 진행 중단
  
          let result;
          try {
            // generator.next(val) 또는 generator.throw(err) 호출
            result = generator[verb](arg);
          } catch (err) {
            return reject(err);
          }
  
          const { value, done } = result;
  
          if (done) return resolve(value);
  
          // 1. yield된 값이 cancelable 객체(promise + cancel)인지 확인
          if (value && typeof value.cancel === 'function' && value.promise instanceof Promise) {
            currentChild = value; // 장부에 등록
  
            value.promise
              .then(val => {
                currentChild = null; // 작업 완료 시 등록 해제
                step('next', val);
              })
              .catch(err => {
                currentChild = null;
                step('throw', err);
              });
          } else {
            // 2. 일반 Promise이거나 일반 값인 경우
            Promise.resolve(value)
              .then(val => step('next', val))
              .catch(err => step('throw', err));
          }
        }
  
        // 최초 실행 시작
        step('next');
      });
  
      return {
        promise,
        cancel() {
          if (isCanceled) return;
          isCanceled = true;
  
          // [중요] 현재 실행 중인 자식이 있다면 자식부터 취소 (Deep Cancel)
          if (currentChild) {
            currentChild.cancel();
          }
  
          // 제너레이터 실행을 강제로 종료시키고 finally 블록으로 점프하게 함
          try {
            generator.return();
          } catch (e) {
            // 종료 과정에서의 에러 처리
          }
  
          reject(new CancelationError());
        }
      };
    };
  }