import { request } from 'node:https'
import consumers from 'node:stream/consumers'
const req = request(
  'https://example.com/somefile.json',
  async res => {
    const text = await consumers.text(res)
    // const blob = await consumers.blob(res)
    // const buffer = await consumers.buffer(res)
    // const json = await consumers.json(res)
    // console.log(buffer)
    // console.log(blob)
    console.log(text)
    // console.log(json)
  }
)
req.end()


/*
    스트림은 한번만 읽을수있는 데이터 흐름! 
    여러번 소비 불가. 
    const text = await consumers.text(res) 이게 완료되면 res는 모두 비어짐. 
*/