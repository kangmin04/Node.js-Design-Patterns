import { createServer } from "node:http";

createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const { code, args } = JSON.parse(body);
            console.log('code:', code);
            console.log('args:', args);
            res.end('ok');
        });
    }
}).listen(3000, () => console.log(`Server is running on http://localhost:3000`));