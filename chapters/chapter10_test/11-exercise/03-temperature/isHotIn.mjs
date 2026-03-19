export async function isHotIn(url){
    const weather = await fetch(url); 
    // console.log('log from is hot in : ' , weather)
    const threshold = thresholdFunc(weather); 
    const result = weather.temp > threshold ? true : false
    return result; 
}

export async function isHotInDI({fetch, url}){ //처음엔 obj로 받고, obj.fetch 처럼 사용함 BUT 객체 디스트럭팅이 더 좋은 방향 
    const weather = await fetch(url); 
    const threshold = thresholdFunc(weather); 
    return weather.temp > threshold
    
}

const thresholdFunc = (weatherObj) => {
    if(!(weatherObj.unit === 'C' || weatherObj.unit === 'F')){
        throw new Error('Check type of temperature'); 
    }
    if(weatherObj.unit === 'C'){
        return 30; 
    }
    return 86; 
}
