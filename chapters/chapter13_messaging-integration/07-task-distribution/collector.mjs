import zmq from 'zeromq'
const sink = new zmq.Pull() // pull socket으로 log aggregator. 
await sink.bind('tcp://*:5017') /* durable node기에 bind해줌, conenct는 worker같은 transient용 */
for await (const rawMessage of sink) {
  console.log('Message from worker: ', rawMessage.toString())
}
