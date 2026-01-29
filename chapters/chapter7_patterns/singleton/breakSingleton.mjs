import { dbInstance as singletonInstance } from './dbBasic.mjs';

console.log('--- 싱글톤 인스턴스 정보 ---');
console.log(`Instance Name: ${singletonInstance.getName()}`);
console.log(`Created At: ${singletonInstance.createdAt.toISOString()}`);

console.log('\n--- 싱글톤 패턴 우회 시도 ---');
console.log('`new singletonInstance.constructor()`를 사용하여 새 인스턴스 생성...');

// dbInstance.constructor를 통해 숨겨진 원본 생성자에 접근하여 새 인스턴스를 만듭니다.
const anotherInstance = new singletonInstance.constructor('another-db');

console.log('\n--- 새로 생성된 인스턴스 정보 ---');
console.log(`Instance Name: ${anotherInstance.getName()}`);
console.log(`Created At: ${anotherInstance.createdAt.toISOString()}`);


// 두 인스턴스가 같은지 비교합니다.
const areTheySame = singletonInstance === anotherInstance;

console.log(`\n두 인스턴스는 같은가? ${areTheySame ? 'YES' : 'NO'}`); // "NO"가 출력됩니다.
