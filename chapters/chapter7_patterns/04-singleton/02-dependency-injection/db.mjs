import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
export function createDb(filename) {
  return open({
    filename,
    driver: sqlite3.Database,
  })
}
/*
  팩토리 형태로 객체 생성 로직을 캡슐화 -> 복잡한 초기화를 숨겨줌 + 조건에 맞게 db 설정가능
*/


/*=----------------------------------------------------------------------------------------------- */

/*
  mock으로 unit test
*/
const createMockDb = async () => {
  console.log('Mock DB created for testing');
  return {
    run: (query, ...params) => { /* 가짜 실행 */ },
    all: (query, ...params) => { return []; /* 항상 빈 배열 반환 */ },
  };
};

// 환경에 따라 적절한 DB 인스턴스를 생성하여 반환하는 팩토리 함수
// createSqliteDb는 위 createDb를 가리키는 개념 설명용 이름(실제 파일명과의 불일치는 설명 목적)
export async function databaseFactory() {
  if (process.env.NODE_ENV === 'test') {
    return createMockDb();
  }
  // eslint-disable-next-line no-undef -- 개념 설명용: 실제로는 createDb(filename)를 가리킴
  return createSqliteDb();
}

