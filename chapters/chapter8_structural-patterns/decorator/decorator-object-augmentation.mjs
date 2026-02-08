import { StackCalculator } from "./decorator-composition.mjs";

function patchDecorator(calculator){
    
    calculator.add = () => {
            const addend2 = calculator.getValue()
            const addend1 = calculator.getValue()
            const result = addend1 + addend2
            calculator.putValue(result)
            return result
        
    }
    const divideOrigin = calculator.divide ; 
    calculator.divide = () => {
        // const divideOrigin = calculator.divide ; 
        if(calculator.peekValue === 0){
            throw new Error('Division by 0')
        }
        return divideOrigin.apply(calculator)
        // return calculator.divide() //아하! infinite recursion..... 
    }

    return calculator
}


const calculator = new StackCalculator()
console.log(calculator)
const enchanceCalculator = patchDecorator(calculator)
console.log(enchanceCalculator)
enchanceCalculator.putValue(8)
enchanceCalculator.putValue(4)
console.log(enchanceCalculator.divide())
