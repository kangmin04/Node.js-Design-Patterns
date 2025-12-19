// 로딩 상태를 관리하는 변수
let isLoading = false;

function fetchData() {
  isLoading = true;
  console.log("데이터를 가져오는 중... (로딩 시작)");

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 성공과 실패 시나리오를 바꿔가며 테스트 해보세요.
      
      // 1. 성공 시나리오
      // resolve("데이터 가져오기 성공!");

      // 2. 실패 시나리오
      reject(new Error("네트워크 오류 발생!"));
    }, 1500);
  });
}

fetchData()
  .then(result => {
    console.log("성공:", result);
    
  })
  .catch(error => {
    console.error("실패:", error.message);
    
  })
  //finally- 인자를 받지않는다 ! 단지 프로미스 끝남만을 알림. 
  //finally에서 반환하더라도 그 값은 무시되며 다음 콜백으로 전달 안된다. 
  .finally(() => {
    isLoading = false;
    console.log("작업 완료. (로딩 끝)");
    // 이 부분은 성공하든 실패하든 항상 실행됩니다.
  });