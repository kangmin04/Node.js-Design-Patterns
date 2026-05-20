import zmq from 'zeromq'

const fromVentilator = new zmq.Pull()
fromVentilator.connect('tcp://localhost:5016')
for await (const rawMessage of fromVentilator) {
    console.log(rawMessage.toString())
}