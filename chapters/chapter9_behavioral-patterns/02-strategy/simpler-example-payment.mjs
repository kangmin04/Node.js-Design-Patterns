class CreditCardStrategy {
    pay(amount) {
      console.log(`${amount}원을 카드로 결제합니다.`);
    }
  }
  class KakaoPayStrategy {
    pay(amount) {
      console.log(`${amount}원을 카카오페이로 결제합니다.`);
    }
  }
  
  // Context: 전략을 사용하는 객체
  class ShoppingCart {
    constructor(amount) {
      this.amount = amount;
    }
  
    setPaymentStrategy(strategy) {
      this.paymentStrategy = strategy;
    }
  
    checkout() {
      this.paymentStrategy.pay(this.amount);
    }
  }
  
  const cart = new ShoppingCart(10000);
  
  cart.setPaymentStrategy(new CreditCardStrategy());
  cart.checkout(); // 출력: 10000원을 카드로 결제합니다.
  
  cart.setPaymentStrategy(new KakaoPayStrategy());
  cart.checkout(); // 출력: 10000원을 카카오페이로 결제합니다.
  