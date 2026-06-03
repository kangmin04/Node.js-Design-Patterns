const res = await fetch('http://example.com/somefile.json')
const buffer = await res.json()
console.log(buffer)

/*
    fetch는 consumer 모듈이 내장됨. 
    res also exposes .blob(), .arrayBuffer(), and .text()
    BUT buffer은 존재안함. -> buffer은 웹 내장 아님. Node내장 클래스.
*/