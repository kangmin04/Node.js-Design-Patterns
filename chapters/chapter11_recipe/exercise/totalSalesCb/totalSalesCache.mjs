import { totalSales as totalSalesRaw } from "./totalSales.mjs";

const CACHE_TTL = 30 * 1000; // 캐시 유효 시간: 30초
const cache = new Map();     // 완료된 계산 결과를 저장하는 캐시
const inFlight = new Map();    // "진행 중"인 계산과 대기열을 관리

/**
 * totalSalesRaw 함수를 감싸서 캐싱과 배칭 기능을 추가한 래퍼 함수입니다.
 *
 * @param {string} product - 계산할 제품 이름
 * @param {function} callback - 최종 사용자(서버)가 제공한 콜백
 */
export function totalSalesWrapper(product, callback) { 
  // 1. 캐시 확인 (가장 빠른 경로)
  if (cache.has(product)) {
    console.log(`[Cache] HIT for: ${product}`);
    // 캐시된 값을 즉시 반환합니다.
    // process.nextTick을 사용하여 동기/비동기 동작을 일관되게 만듭니다.
    // (캐시가 없을 땐 항상 비동기인데, 있을 때도 비동기로 동작시켜 예측 가능성을 높임)
    return process.nextTick(callback, null, cache.get(product));
  }

  // 2. "진행 중"인 작업 확인 (배칭/요청 편승)
  if (inFlight.has(product)) {
    console.log(`[Batch] Joining in-flight request for: ${product}`);
    // 이미 계산 중인 작업이 있다면, 새로운 계산을 시작하지 않습니다.
    // 대신, 대기열(배열)에 사용자 콜백을 추가하기만 합니다.
    inFlight.get(product).push(callback);
    return;
  }

  // 3. 새로운 계산 시작
  console.log(`[New] Starting calculation for: ${product}`);
  // 이 계산이 "진행 중"임을 표시하고, 대기열에 현재 콜백을 넣습니다.
  inFlight.set(product, [callback]);


  
  // 4. "특별한 콜백" 생성 및 원본 함수 호출
  // 이 콜백은 캐싱, 상태 정리, 결과 전파 등 모든 것을 지휘합니다.
  const specialCallback = (err, result) => {
    // 계산이 끝나면 이 콜백이 실행됩니다.

    // 에러가 없으면 결과를 캐시에 저장합니다.
    if (!err) {
      cache.set(product, result);
      // TTL(유효시간)이 지나면 캐시에서 자동으로 삭제되도록 타이머를 설정합니다.
      setTimeout(() => {
        console.log(`[Cache] Expired for: ${product}`);
        cache.delete(product);
      }, CACHE_TTL);
    }

    // 이 제품에 대한 계산은 더 이상 "진행 중"이 아닙니다.
    // 대기 중이던 모든 콜백들을 가져온 후, inFlight에서 항목을 삭제합니다.
    const waitingCallbacks = inFlight.get(product);
    inFlight.delete(product);

    // 대기열에 있던 모든 사용자 콜백들에게 결과를 전파합니다.
    for (const waitingCb of waitingCallbacks) {
      process.nextTick(waitingCb, err, result);
    }
  };

  // 원본 계산 함수를 "특별한 콜백"과 함께 호출합니다.
  totalSalesRaw(product, specialCallback);
}
