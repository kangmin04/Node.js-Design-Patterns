class Database {
    constructor(name) {
      this.name = name;
      this.createdAt = new Date();
      console.log(`[${this.createdAt.toISOString()}] Database instance "${this.name}" created.`);
    }
  
    getName() {
      return this.name;
    }
  }
  
  // 클래스를 직접 내보내지 않고, 오직 인스턴스만 생성하여 내보냅니다.
  // 이것이 Node.js에서 흔히 사용하는 '모듈 스코프 싱글톤'입니다.
  const dbInstance = new Database('main-db');
  
  export { dbInstance };