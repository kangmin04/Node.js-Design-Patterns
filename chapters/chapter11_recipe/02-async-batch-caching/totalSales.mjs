import {Level} from 'level'
const db = new Level('sales', {valueEncoding: 'json'})

/* LevelDB
    키-값(Key-Value) 저장소
    파일 시스템 기반 데이터베이스 -> 첫 인자(sales)로 파일 저장 위치를 정함.(루트에 sales 폴더 생기고 .ldb 형식으로 저장됨. 
    바이너리 데이터만 가능한데 option으로 json encoding 방식. -> 쓰고 읽을때 JSON 부호화 작업 해줌. 
*/

export async function totalSales(product) {
    const now = Date.now()
    let sum = 0;
  
    for await (const [_transactionId, transcation] of db.iterator()){
        if(!product || transcation.product === product){
            sum += transcation.amount
        }
   }
   console.log(`totalSales() took: ${Date.now() - now}ms`)

   return sum
}

/*
① 스트리밍 데이터 접근
LevelDB는 모든 데이터를 키(Key) 기준으로 정렬된 상태(LSM 트리). 
iterator()를 호출하면 데이터베이스의 시작점부터 끝점까지 (혹은 특정 범위 내에서) 정렬된 순서대로 데이터를 하나씩 가져옴

② for await...of와의 관계
db.iterator()는 Async Iterable 객체를 반환
데이터베이스의 모든 데이터를 한꺼번에 메모리에 올리지 않습니다.
루프가 돌 때마다 다음 데이터를 디스크에서 읽어오거나 버퍼에서 가져옵니다.
덕분에 데이터가 수백만 건이라도 메모리 부족(OOM) 없이 처리할 수 있지만, 디스크 I/O가 계속 발생하므로 속도는 느릴 수밖에 없습니다.

③ 성능 병목 현상 (Full Scan)
필터링의 부재: db.iterator()는 "모든 데이터"를 다 훑습니다.
조건부 계산: 루프 내부의 if (transaction.product === product)는 일단 데이터를 다 읽어온 후에 메모리 상에서 검사하는 방식입니다.
결론: 10만 개의 데이터가 있다면 10만 번의 디스크 접근과 역직렬화(JSON Parse)가 발생하므로 응답 시간이 수백ms에서 수초까지 걸리게 됩니다.
*/


/* db.iterator()은 readable stream. 
readable stream은 eventEmitter을 상속함. 
->  */