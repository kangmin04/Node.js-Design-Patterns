import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 💡 ES Modules에서 현재 디렉터리 경로(__dirname)를 구하는 표준 방식
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROTO_PATH = join(__dirname, 'order.proto');

// proto Load
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

const app = express();

// 50051 포트에서 구동 중인 로컬 gRPC 서버와 연결
const client = new orderProto.OrderService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

app.get('/order-test', (req, res) => {
  // 로컬 함수를 호출하듯이 gRPC 메서드 호출
  client.CreateOrder({ item: '맥북', quantity: 2 }, (err, response) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

app.listen(3000, () => console.log('Gateway 구동 중 (Port 3000)'));