//multiplexChannels([child.stdout, child.stderr], socket) // 3
import {connect} from 'node:net'
import {fork} from 'node:child_process'

function multiplexChannels(sources ,destination){
    let openSource = sources.length;     
    for (let i = 0 ;i < sources.length ; i++){
        sources[i]
        .on('readable' , () => {
            let chunk; 
            while((chunk = sources[i].read()) !==null){  //
                let outbuff = Buffer.alloc(1+4+chunk.length); 
                outbuff.writeUInt8(i,0) //i번째 표시위해 for of -> for i로
                outbuff.writeUInt32BE(chunk.length , 1) 
                chunk.copy(outbuff,5); 
                destination.write(outbuff); //socket으로 서버 전송
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

const socket = connect(3000 , () => { //connect로 서버와 연결, 연결 성공시 net.Socket 객체를 반환
    const child = fork( // 2
        process.argv[2],
        process.argv.slice(3),
        { silent: true } //자식 프로세스의 stdout , stderr 스트림에 접근 가능
        //child.stdout : 자식 프로세스의 표준출려을 나타내는 readableStream. console.log로출력하는 모든 데이터가 이 스트림으로 흘러나옴 

      )
      multiplexChannels([child.stdout, child.stderr], socket) // 3
})

//해당 코드들 진행 순서가 그럼     1. 서버 3000에 띄어둠 2.  client 실행 시 3000번에 연결하고 성공하면 자식 프로세스 만들어서 multplex 호출. 3. 