import { StackCalculator } from "./proxy-composition.mjs";

const proxyhandler = {
    get : (target , property) => {
        if(property === 'divide'){
            if(target.peekValue() === 0){
                throw new Error('Dividor is not allowed 0')
            }
            return target.divide()
        }
        return target[property]; 

    }
}


const calculator = new StackCalculator(); 
const safeCalculator = new Proxy(calculator , proxyhandler)


calculator.putValue(3)
calculator.putValue(2)
console.log(calculator.multiply()) // 3*2 = 6

safeCalculator.putValue(2)
console.log(safeCalculator.multiply()) // 6*2 = 12

calculator.putValue(0)
console.log(calculator.divide()) // 12/0 = Infinity

safeCalculator.clear()
safeCalculator.putValue(4)
safeCalculator.putValue(0)
console.log(safeCalculator.divide()) // 4/0 -> Error('Division by 0')