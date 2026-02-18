/*
    유지보수 관점에서 새로운 데이터 추가 시 else문 추가보다 , 그냥 해당 클래스만을 
    만들어주면됨! 

    function checkout(paymentMethod, amount) {
        if (paymentMethod === 'creditCard') {
        // 신용카드 결제 로직
        } else if (paymentMethod === 'paypal') {
        // 페이팔 결제 로직
        } else if (paymentMethod === 'bankTransfer') {
        // 계좌이체 로직
        }
        // ... 새로운 결제 방식 추가 시 계속 else if 추가
    }
*/

// 1. Strategy Interface (개념적)
// 모든 PaymentStrategy는 'pay' 메서드를 가져야 합니다. //자바에서는 interface로 가능하나 , js 에선 없음 

// 2. Concrete Strategies
class CreditCardStrategy {
    constructor(name, cardNumber) {
      this.name = name;
      this.cardNumber = cardNumber;
    }
  
    pay(amount) {
      console.log(`${amount}원을 ${this.name} 신용카드로 결제합니다.`);
    }
  }
  
  class PayPalStrategy {
    constructor(email) {
      this.email = email;
    }
  
    pay(amount) {
      console.log(`${amount}원을 ${this.email} 페이팔 계정으로 결제합니다.`);
    }
  }
  
  // 3. Context
  class ShoppingCart {
    constructor() {
      this.items = [];
      this.paymentStrategy = null;
    }
  
    addItem(item) {
      this.items.push(item);
    }
  
    setPaymentStrategy(strategy) {  /* 결제 방법에 따라서 다른 strategy Instance -> 다른 payment logic 구현 */
      this.paymentStrategy = strategy;
    }
  
    checkout() {
      const total = this.items.reduce((sum, item) => sum + item.price, 0);
      if (!this.paymentStrategy) {
        throw new Error("결제 방법이 선택되지 않았습니다.");
      }
      // Context는 구체적인 결제 방법을 모르고, 단지 위임할 뿐입니다.
      this.paymentStrategy.pay(total);
    }
  }
  
  
  const cart = new ShoppingCart();
  cart.addItem({ name: "노트북", price: 1200000 });
  cart.addItem({ name: "마우스", price: 50000 });
  
  /*strategy = credit card*/
  const creditCard = new CreditCardStrategy("홍길동", "1234-5678-xxxx-xxxx");
  cart.setPaymentStrategy(creditCard);
  cart.checkout(); // 출력: 1250000원을 홍길동 신용카드로 결제합니다.
  
  console.log('--- 결제 방법 변경 ---');
  

  const payPal = new PayPalStrategy("gildong@example.com");
  cart.setPaymentStrategy(payPal);
  cart.checkout(); // 출력: 1250000원을 gildong@example.com 페이팔 계정으로 결제합니다.