import { setTimeout as setTimeoutPromise } from 'node:timers/promises';

const ac = new AbortController();
const signal = ac.signal;

// 1초 뒤에 취소 신호를 보냅니다. (이 부분은 일반 콜백 setTimeout 사용)
setTimeout(() => {
    console.log('보냄!, abort');
    ac.abort(); 
}, 1000); 

try {
    console.log('5초 대기를 시작합니다... (하지만 1초 안에 취소될 예정)');
    // 5초 동안 기다리는 Promise를 생성하고, 취소 신호(signal)를 전달합니다.
    await setTimeoutPromise(5000, 'done', { signal });
    // 취소되면 이 라인 아래는 실행되지 않습니다.
    console.log('대기 완료! (이 메시지는 보이지 않아야 함)');

} catch (err) {
    // AbortController에 의해 취소되면 'AbortError'가 발생합니다.
    if (err.name === 'AbortError') {
        console.log('setTimeoutPromise 작업이 성공적으로 취소되었습니다!');
    } else {
        console.log(`예상치 못한 에러 발생: ${err.name}`);
    }
}
