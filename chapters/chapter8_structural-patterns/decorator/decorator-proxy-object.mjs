import { StackCalculator } from "./decorator-composition.mjs"

const enhancedCalculatorHandler = {
    get(target , property){
        if(property === 'add'){
            return function add(){

                const add1 = target.getValue(); 
                const add2 = target.getValue(); 
                const result = add1 + add2;
                target.putValue(result); 
                return result;
            }
        }

        if(property === 'divide'){
            return () => {
                const divisor = target.peekValue()
                if (divisor === 0) {
                  throw new Error('Division by 0')
                }
              
                return target.divide()
            }
        }
        return target[property]
    }
}
const calculator = new StackCalculator()
const enhancedCalculator = new Proxy(
  calculator,
  enhancedCalculatorHandler
)
enhancedCalculator.putValue(8)
enhancedCalculator.putValue(4)
console.log(enhancedCalculator.add())