function createLazyBuffer(size) {
    let buffer = null;
    let offset = 0; /* 기존 코드는 offset 명시없어서 write시 전체를 업데이트했음. offset으로 이후부터 작성되게 하면 두번째 내용도 전체가 다 나옴  */

    const ensureBuffer = () => {
      if (!buffer) {
        console.log('첫 호출: 버퍼를 생성합니다.');
        buffer = Buffer.alloc(size);
      }
    };
  
    return new Proxy({}, {
      get(target, property) {
        if (property === 'write') {
          return function(data) {
            ensureBuffer(); 
            const bytesWritten = buffer.write(data, offset); 
            offset += bytesWritten; 
            return bytesWritten;
          };
        }
        
        if (property === 'toString') {
            return () => {
                // 쓰기 작업이 아직 없었다면 버퍼는 null일 수 있습니다.
                if (!buffer) {
                    return '';
                }
                return buffer.toString('utf-8', 0, offset); // 4. 오프셋까지만 문자열로 변환
            }
        }
  
        // 다른 모든 속성은 실제 버퍼에 위임합니다.
        ensureBuffer();
        const prop = buffer[property]; 
        // 메서드인 경우, 'this'가 실제 버퍼를 가리키도록 바인딩
        return typeof prop === 'function' ? prop.bind(buffer) : prop;
      }
    });
  }
  
  
  const lazyBuffer = createLazyBuffer(12);
  
  console.log('--- 첫 번째 write 호출 ---');
  lazyBuffer.write('test'); // "첫 호출: 버퍼를 생성합니다." 출력
  console.log(lazyBuffer.toString()); // "test" 출력
  
  console.log('\n--- 두 번째 write 호출 ---');
  lazyBuffer.write(' more'); // 이제 버퍼를 새로 생성하지 않습니다.
  console.log(lazyBuffer.toString()); // "test more" 출력
  lazyBuffer.slice(3) 
  /*
    우리가 호출한 lazyBuffer.slice(3)에서 호출 주체는 lazyBuffer. 즉 , slice메서드에서 this는 lazyBuffer임
    get 핸들러가 property 가로채서 실제 buffer인스턴스에서 원본 slice 메서드 가져옴
    그냥 buffer[property]를 반환하면 (=원본 slice 메서드 반환) -> 이 메서드가 실행될 때 this는 laztBuffer로 프록시 객체가 됨! 
    buffer[property]는 내부적으로 this가 Buffer 인스턴스일것이라 가정하고 ,this의 메모리 슬롯에 접근하려함. 
    lazyBuffer은 빈 객체이므로 ERROR
  */