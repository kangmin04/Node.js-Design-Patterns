import zmq from 'zeromq'

const ventilator = new zmq.Push();
await ventilator.bind('tcp://*:5016')
let id = 1;

const sendMessage = async () => {
    try {
        console.log(`Sending message: ${id}`)
        await ventilator.send(`[${id}] Hello!`)
        console.log(`Message ${id} sent.`)
        id++;
    } catch (e) {
        console.error('Could not send message', e)
    } finally {
        setTimeout(sendMessage, 1000 * 3)
    }
}

sendMessage()
