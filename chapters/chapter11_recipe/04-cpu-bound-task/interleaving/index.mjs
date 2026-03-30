import { createServer } from 'node:http'
// import { SubsetSum } from './subsetSum.mjs'
import { SubsetSum } from './subsetSumDefer.mjs'
// import { SubsetSum } from './subsetSumFork.js'
// import { SubsetSum } from './subsetSumThreads.js'

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname !== '/subsetSum') {
    res.writeHead(200)
    return res.end("I'm alive!\n")
  }

  const data = JSON.parse(url.searchParams.get('data'))
  const sum = JSON.parse(url.searchParams.get('sum'))
  res.writeHead(200)
  const subsetSum = new SubsetSum(sum, data)
  subsetSum.on('match', match => {
    res.cork()
    res.write(`Match: ${JSON.stringify(match)}\n`)
    res.uncork()
  })
  /*
    writable.cork() method forces all written data to be buffered in memory. 
    The buffered data will be flushed when either the stream.uncork() or stream.end() methods are called.
    res.write를 호출한다고해서 그 데이터가 즉시 TCP 패킷으로 만들어지지않음. 
    match가 짧은 시간내에 여러번 발생할경우, res.write도 여러번 호출됨. 이때마다 아주 작은 데이터 조각들을 TCP packet으로 만들어 보내는건 매우 비효율적. (TCP 헤더 붙이는게 더 소요가 큼)
    -> 최적화 ! (내부적으로 데이터를 잠시 버퍼링함. 내부 버퍼에 모아두다가 버퍼가 일정 크기가 차거나, 데이터 흐름이 끝난경우, 강제로 flush 호출될 경우(res.uncork) 한번에 묶어 더 큰 패킷으로 보냄)
  */
  subsetSum.on('end', () => res.end())
  subsetSum.start()
}).listen(8000, () => console.log('Server started'))