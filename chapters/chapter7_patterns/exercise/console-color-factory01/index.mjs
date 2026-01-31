import { RedConsole ,BlueConsole , GreenConsole } from "./colorConsole.mjs"

/*
    factory함수는 어떤 종류의 객체를 만들지만 결정하는게좋다. 
    기존엔 constructor로 color , input을 보내서 createcolor부터 input을 줬는데 
    팩토리는 그냥 색상에 따른 객체만 선택하고 input은 실제 log에 인자로 전달해야함. 
*/
function createColor(inputColor) {
    if(inputColor === 'red'){
        return new RedConsole()
    }else if(inputColor === 'blue'){
        return new BlueConsole()
    }else if(inputColor === 'green'){
        return new GreenConsole()
    }else{
        console.log('Enter wrong color')
    }
}





const redConsole = createColor('red' )
const blueConsole = createColor('blue')
const greenConsole = createColor('green')

redConsole.log('this is red context'); 
blueConsole.log('this is blue one'); 
greenConsole.log('last one is green one'); 