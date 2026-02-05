import { StackCalculator } from "./proxy-composition.mjs";

function createSafeCalculator(calculator) {
    const safeCalculator = {
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
    }
  
    // delegated methods
    for (const fn of ['putValue', 'getValue', 'peekValue', 'clear', 'multiply']) {
      safeCalculator[fn] = calculator[fn].bind(calculator)
    }
  
    return safeCalculator
  }