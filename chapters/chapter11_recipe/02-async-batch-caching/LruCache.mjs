// class Node {
//     constructor(value) {
//       this.value = value;
//       this.next = null;
//       this.prev = null;
//     }
//   }


// class LRUCache{
//     constructor(max){
//         this.capacity = max; 
//         this.cache = new Map(); 
//         this.head = new Node(); 
//         this.tail = new Node(); 
//     }

//     get(key){
//         if(this.cache.has(key)){
//             const data = this.cache.get(key); 
//             this.head.next = data; 
//             return data; 
//         }
//         return null; 
//     }
// }

class LRUCache {
    constructor(capacity) {
      this.capacity = capacity;
      this.cache = new Map();
    }
  
    get(key) {
      if (!this.cache.has(key)) return null;
  
      // 핵심: 읽은 데이터를 '가장 최근' 상태로 만들기 위해 재삽입
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
  
    put(key, value) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
      } else if (this.cache.size >= this.capacity) {
        // Map.keys().next().value는 가장 처음에 삽입된(가장 오래된) 키를 반환
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
      this.cache.set(key, value);
    }
  }
  
  // 사용 예시
  const cache = new LRUCache(3);
  cache.put('a', 1); cache.put('b', 2); cache.put('c', 3);
  cache.get('a');    // 'a'가 최근 사용됨으로 업데이트
  cache.put('d', 4); // 가장 오래된 'b'가 삭제됨