// cli.js
import { Command } from 'commander' 
const program = new Command() //빌더 객체 생성
program
  .name('string-util')
  .description('CLI to some JavaScript string utilities')
  .version('0.8.0')

  .command('split') //command 이름
  .description('Split a string into substrings and display as an array')
  .argument('<string>', 'string to split') //split command가 받을 인자
  .option('--first', 'display just the first substring')
  .option('-s, --separator <char>', 'separator character', ',')
  .action((str, options) => {
    const limit = options.first ? 1 : undefined
    console.log(str.split(options.separator, limit))
  })
  /*---------- parse전까지 setting함 ---------------------- */
  .parse() 
  /*
    parse는 단순 build와는 다름. build는 setting취합해서 클래스 리턴(url) 하는거라면 , 
    parse는 process.argv로 읽고 , run까지함. (split 명령어 확ㅇ니 후 split의 action명령 체크)
    반환값이 중요한게 아니라 ,action함수를 실행하여 run이 되게하는게 목적임
  */