import { StackCalculator } from "./proxy-composition.mjs"

/*
    proxy는 원본 객체는 그대로 두고 새로운 wrapper 객체로함. 원본은 절대 수정안한다. 
    object augmentaion,monkey patch 는 원본 객체를 직접 수정하는 방법. 특정 메서드를 새로운 함수로 덮어버림. 

     pros - 한두개 method만 proxy할 경우 전체를 delegate할 필요가 없어서 더 간편하다. 
*/

function patchToSafeCalculator(calculator) {
    const divideOrig = calculator.divide 

    calculator.divide = () => {
      const divisor = calculator.peekValue()
      if (divisor === 0) {
        throw new Error('Division by 0')
      }
      /*
        this context 유지 위해서. 
        결국 내부적으론 this.getValue()등을 호출할텐데 이때 this는 calculator을 indicate해야함! 
      */
      return divideOrig.apply(calculator)
    }
  
    return calculator
  }
  
  const calculator = new StackCalculator()
  const safeCalculator = patchToSafeCalculator(calculator)
  
  calculator.putValue(3)
  calculator.putValue(2)
  console.log(calculator.multiply()) // 3*2 = 6
  
  safeCalculator.putValue(2)
  console.log(safeCalculator.multiply()) // 6*2 = 12
  
  // calculator.putValue(0)
  // console.log(calculator.divide()) // 12/0 -> Error('Division by 0')
  
  safeCalculator.clear()
  safeCalculator.putValue(4)
  safeCalculator.putValue(0)
  console.log(safeCalculator.divide()) // 4/0 -> Error('Division by 0')