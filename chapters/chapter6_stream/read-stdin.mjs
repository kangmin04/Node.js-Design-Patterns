process.stdin
  .on('readable', () => {
    let chunk
    console.log('New data available')
    while ((chunk = process.stdin.read()) !== null) {
      console.log(
        `Chunk read (${chunk.length} bytes): "${chunk.toString()}"`
      )
    }
  })
  .on('end', () => console.log('End of stream'))


//test for pipe operation 
//cat /home/user/node-design-system/chapters/chapter6_stream/testfile.txt | node read-stdin.mjs