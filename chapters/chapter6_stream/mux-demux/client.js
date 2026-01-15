//multiplexChannels([child.stdout, child.stderr], socket) // 3
import {connect} from 'node:net'
import {fork} from 'node:child_process'

function multiplexChannels(sources ,destination){
    let openSource = sources.length;     
    for (let i = 0 ;i < sources.length ; i++){
        sources[i]
        .on('readable' , () => {
            let chunk; 
            while((chunk = sources[i].read()) !==null){ // 여기서 왜 this 쓰지, 
                let outbuff = Buffer.alloc(1+4+chunk.length); 
                outbuff.writeUInt8(i,0) //i번째 표시위해 for of -> for i로
                outbuff.writeUInt32BE(chunk.length , 1) 
                chunk.copy(outbuff,5); 
                destination.write(outbuff); 
                console.log('write packet to header(' , i , ')')
            }
        })
        .on('end' , () => {
            if(--openSource === 0 ){
                destination.end(); 
            }
        })
    }
}

const socket = connect(3000 , () => {
    const child = fork( // 2
        process.argv[2],
        process.argv.slice(3),
        { silent: true }
      )
      multiplexChannels([child.stdout, child.stderr], socket) // 3
})