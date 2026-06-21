import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 💡 현재 디렉터리 경로 계산
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROTO_PATH = join(__dirname, 'order.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

// 클라이언트가 CreateOrder를 호출 시 실제로 서버에서 실행될 비즈니스 로직 함수
function createOrder(call, callback) {
  console.log(`[gRPC 서버 로그] 주문 요청 수신: ${call.request.item} ${call.request.quantity}개`);
  
  // 성공 응답 반환
  callback(null, {
    message: `${call.request.item} ${call.request.quantity}개 주문이 성공적으로 처리되었습니다!)`,
    processed_by: "내 로컬 gRPC 서버 프로세스"
  });
}

const server = new grpc.Server();
// 명세서(service)와 실제 구현한 함수를 연결
server.addService(orderProto.OrderService.service, { createOrder });

// 💡 최신 @grpc/grpc-js 표준 구동 방식 (server.start 제거)
server.bindAsync(
    '127.0.0.1:50051', 
    grpc.ServerCredentials.createInsecure(), 
    (error, port) => {
      // 1️⃣ 포트 점유 등으로 바인딩 실패 시 예외 처리
      if (error) {
        console.error(`gRPC 서버 바인딩 실패: ${error.message}`);
        return;
      }
      
      // 2️⃣ bindAsync가 성공하면 자동으로 서버가 리슨 상태가 되므로 start() 없이 로그만 출력
      console.log(`gRPC 전용 서버 구동 완료 (Port: ${port})`);
    }
  );