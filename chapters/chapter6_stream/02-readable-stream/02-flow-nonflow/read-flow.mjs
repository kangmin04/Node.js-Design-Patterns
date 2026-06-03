//Flow Ver
//it will automatically get the data. 
//it passes chunk to data event handler. 
//you CAN'T CONTROL size and timing. 
//IF YOU WANT TO CONTROL -> USE NON FLOW MODE
process.stdin
  .on('data', (chunk) => {
    console.log('New data available')
    console.log(
      `Chunk read (${chunk.length} bytes): "${chunk.toString()}"`
    )
  })
  .on('end', () => console.log('End of stream'))