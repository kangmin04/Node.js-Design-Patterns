import { StackCalculator } from "./proxy-composition.mjs"

function createSafeCalculator(calculator) {
    return {
      // proxied method
      divide() {
        // additional validation logic
        const divisor = calculator.peekValue()
        if (divisor === 0) {
          throw new Error('Division by 0')
        }
        // if valid delegates to the subject
        return calculator.divide()
      },
      // delegated methods
      putValue(value) {
        return calculator.putValue(value)
      },
      getValue() {
        return calculator.getValue()
      },
      peekValue() {
        return calculator.peekValue()
      },
      clear() {
        return calculator.clear()
      },
      multiply() {
        return calculator.multiply()
      },
    }
  }
  const calculator = new StackCalculator()
  const safeCalculator = createSafeCalculator(calculator)