import { createServer } from 'node:http'

const { pid } = process
const server = createServer((req, res) => {
    console.log(`req.url 출력결과: ${req.url}`)
    const url = new URL(req.url, `http://${req.headers.host}`)
    console.log(`url 출력결과: ${url}`)

    const searchParams = url.searchParams

    console.log(`Request ${searchParams.get('request')} from ${pid}`)
    res.end(`Hello from ${pid}\n`)
})

const port = Number.parseInt(process.env.PORT || process.argv[2]) || 8080
server.listen(port, () => console.log(`Started at ${pid}`))