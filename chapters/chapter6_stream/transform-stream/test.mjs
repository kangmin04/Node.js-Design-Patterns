const chunk = 'orld!'; 
const pieces = chunk.split('World')

console.log(pieces)  
  const lastPiece = pieces[pieces.length - 1] // 2
  console.log('last' , lastPiece) //tail
  const tailLen = 'World'.length - 1
  console.log('tailLen' , tailLen)
  console.log('-tailLen' , -tailLen)
const tail = lastPiece.slice(-tailLen)
console.log('tail : ' , tail)