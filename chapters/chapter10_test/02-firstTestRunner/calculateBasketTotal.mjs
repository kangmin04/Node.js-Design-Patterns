export function calculateBasketTotal(basket) {
    let total = 0
    for (const item of basket.items) {
      total += item.unitPrice * item.quantity // * item.quantity 없는 경우로 unit test함
    }
    return total
  }