/*
    rest api
    given letter 로 시작하는 people 이름 list 가져오기 !
    3개의 데이터베이스 or 인스턴스 만들어야함 (a-d, e-p, q-z)
    하나의 public API만 공개! -> api/people/byFirstName/{letter}형식으로 공개하고
    해당 API로 letter 들어온 경우, 어디에 속하는지 판단해서 해당 인스턴스로 전달! 
    (로드밸런서로 각 백엔드로 전달 OR API orchestration layer로 mapping logic 포함해서 traffic redirect 구현)
*/

import { createServer } from "node:http";
import { dataInit } from "./fakeDataMaker.mjs";
import AtoD from './AtoD.json' with { type: 'json' };
import EtoP from './EtoP.json' with { type: 'json' };
import QtoZ from './QtoZ.json' with { type: 'json' };
// const initTF = await dataInit(); 
// if(!initTF){
//     console.log('data prep went wrong.')
// }

const port = process.argv[2]; //node index.mjs 8081

const server = createServer((req,res) => {
    try{
        const databaseObject = port === '8081' ? AtoD : port === '8082' ? EtoP : QtoZ
        const database = Object.values(databaseObject) 

        const startWithLetter = database.filter(user => user.username.toLowerCase().startsWith(req.url.split('/').pop()))    
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(startWithLetter));
    }catch(err){
        console.log(err)
    }
})

server.listen(port, () => {
    console.log(`server-instance is running on http://localhost:${port}`)
})
