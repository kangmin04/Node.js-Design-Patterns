import { createConnection } from "node:net";
import { createReadStream } from "node:fs";

const inputFiles = process.argv.slice(2);

const client = createConnection({ port: 8080 }, () => {
  console.log('client: server/client connected');
  sendFileToServer(inputFiles, client);
});

client.on('end', () => {
  console.log('client: client end');
});

client.on('data', (data) => {
  console.log('client: data received', data.toString());
});

function sendFileToServer(inputFiles, destination) {
  for (let i = 0; i < inputFiles.length; i++) {
    const newStream = createReadStream(inputFiles[i]);

    newStream
      .on('readable', () => {
        let chunk;
        while ((chunk = newStream.read()) !== null) {
          const packet = Buffer.alloc(1 + 4 + chunk.length); //그전엔 1+8로 예전에 test하던걸 그대로 적용함.. 제대로 다시 보자
          packet.writeUInt8(i, 0); // Channel ID (1 byte)
          packet.writeUInt32BE(chunk.length, 1); // Length of the chunk (4 bytes)
          chunk.copy(packet, 5); // Copy the chunk data after the 5-byte header
          
          destination.write(packet); 
          console.log(`Wrote packet to channel (${i}) with length ${chunk.length}`);
        }
      })
      .on('end', () => {
        console.log(`Finished reading file: ${inputFiles[i]}`);
        // If this is the last file, end the connection
        if (i === inputFiles.length - 1) {
          console.log('All files sent. Closing connection.');
          destination.end();
        }
      });
  }
}
