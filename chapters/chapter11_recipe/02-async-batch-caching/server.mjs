import { createServer } from "node:http";
// import { totalSales } from "./totalSales.mjs";
// import { totalSales } from "./totalSalesBatch.mjs";
import { totalSales } from "./totalSalesCache.mjs";
createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const product = url.searchParams.get('product'); 
    console.log(`Processing query: ${url.search}`)
    const sum = await totalSales(product); 
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200); 
    res.end(JSON.stringify({
        product, 
        sum
    }))
}).listen(8000, () => console.log('server is started on http://localhost:8000'))