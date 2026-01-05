import { createServer } from 'node:http'
import Chance from 'chance' // v1.1.12
const chance = new Chance()

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' }) // 1
  do { // 2
    res.write(`${chance.string()}\n`)
  } while (chance.bool({ likelihood: 95 }))
  res.end('\n\n') // 3
  res.on('finish', () => console.log('All data sent')) // 4
})
server.listen(3000, () => {
  console.log('listening on http://localhost:3000')
})

// Transfer-Encoding: chunked

// 이 방식은 서버가 응답 데이터 전체 크기를 미리 알 수 없을 때 사용됩니다. 예를 들어, 대용량 파일을 스트리밍하거나 데이터베이스에서 많은 양의 데이터를 조회해서 보낼 때 유용합니다.
// Content-Length(전체 크기) 헤더 대신, 데이터를 여러 개의 **조각(chunk)**으로 나누어 보냅니다.
// 각 조각은 [16진수 길이] + \r\n + [데이터] + \r\n 형식으로 구성됩니다.
// 마지막에는 길이가 0인 종료 조각을 보내 데이터 전송이 끝났음을 알립니다.