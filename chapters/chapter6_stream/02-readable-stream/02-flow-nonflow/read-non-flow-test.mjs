//NON-FLOW
//readable event test
//read 시 internal buffer에 사이즈 만큼이 없는 경우 null 반환하고 다시 시도함. 
let i = 0 
process.stdin
  .on('readable', () => {
        let chunk = process.stdin.read(10)
        if(chunk === null){
          console.log('not yet')
        }else{
          console.log('done')
        }
          
  }
   )
  .on('end', () => console.log('End of stream'))


//test for pipe operation 
//cat /home/user/node-design-system/chapters/chapter6_stream/testfile.txt | node read-stdin.mjs