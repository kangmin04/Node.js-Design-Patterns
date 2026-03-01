express 에서의 미들웨어 
    - function (req,res,next) 형태
    - 요청과 응답 처리를 위한 파이프라인으로 조직된 서비스들의 집합
    - Intercepting filter pattern , chain of responsibility pattern 적용됨
    - 미들웨어 패턴을 통해 매우 적은 노력 시스템 확장이 가능한 플러그인 인프라 구축 가능 

미들웨어 매니저 
    - 미들웨어 조직 및 실행
    - use() 함수로 새로운 미들웨어 등록(이름은 상관없음) 
    - 새로운 데이터 들어오면 등록된 미들웨어들 비동기적으로 순차 실행, 각 단위는 이전의 실행 결과를 입력으로 받음 
    - next 호출  안하거나 , error 전파하여 중단 가능 
    