import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import portfinder from 'portfinder' // v1.0.37
import { ConsulClient } from './consul.mjs'

/* JSON 배열 형식!! -> 즉, 바로 배열로 사용 가능.  */
import AtoD from './AtoD.json' with { type: 'json' };
import EtoP from './EtoP.json' with { type: 'json' };
import QtoZ from './QtoZ.json' with { type: 'json' };

const serviceType = process.argv[2] //'A-D' OR 'E-P' OR 'Q-Z'
if (!serviceType) {
  console.error('Usage: node app.js <service-type>')
  process.exit(1)
}
function checkDb(){
  if(serviceType === 'A-D'){
    return AtoD; 
  }else if(serviceType === 'E-P'){
    return EtoP; 
  }else if(serviceType === 'Q-Z'){
    return QtoZ; 
  }
}


const consulClient = new ConsulClient()

const port = await portfinder.getPort()
const address = process.env.ADDRESS || 'localhost' // 실제 배포시엔 서버마다 고유한 IP 존재. 
const serviceId = randomUUID()

async function registerService() {
  await consulClient.registerService({
    id: serviceId,
    name: serviceType,
    address,
    port,
    tags: [serviceType],
  })

  console.log(`${serviceType} registered as ${serviceId} on ${address}:${port}`)
}

async function unregisterService(err) {
  err && console.error(err)
  console.log(`deregistering ${serviceId}`)
  try {
    await consulClient.deregisterService(serviceId)
  } catch (deregisterError) {
    console.error(`Failed to deregister service: ${deregisterError.message}`)
  }
  process.exit(err ? 1 : 0)
}

process.on('uncaughtException', unregisterService)
process.on('SIGINT', unregisterService)

const server = createServer((req, res) => {
   // --- 헬스 체크 엔드포인트 추가 ---
   if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
    return; 
    /* 엔드포인트만 설정해두면, 자동으로 check하다가 critical 상태에서 지정된시간(30S) 이후 스스로 deregister됨 */
  }

  
  const database = checkDb();  
  
  const startWithLetter = database.filter(user => user.username.toLowerCase().startsWith(req.url.split('/').pop()))    
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(startWithLetter));  
  
  
  
})

server.listen(port, address, async () => {
  console.log(`Started ${serviceType} on port ${port} with PID ${process.pid}`)
  await registerService()
})