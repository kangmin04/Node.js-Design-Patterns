import { createReadStream } from "node:fs";
import { FilterByCountry } from "./filter-by-country.mjs";
import { sumProfit } from "./sum-profit.mjs";
import { Parser } from "csv-parse";
const csvParser = new Parser({columns : true})

createReadStream('data.csv')
.pipe(csvParser)
.pipe(new FilterByCountry('Italy'))
.pipe(new sumProfit())
.pipe(process.stdout)

//pipe는 인자로 스트림 객체만 받음 
//.pipe(process.stdout) 이게 가능한건 sumProfit 결과를 process.stdout이란 스트림으로 연결하란의미
// .pipe(process.stdout.write('\n')) 이건 스트림 객체가 아닌 , 함수의 호출임.. 
// 해당 코드 실행 시 process.stdout에 출력하란 명령을 내리고 , tf를 반환... pipe는 tf를 더이상 연결 못하기에 오류




//JavaScript 문법의 특징 중 하나로, 클래스의 생성자(constructor)에 전달할 인자(argument)가 없을 경우,
//  new 키워드 뒤에 오는 괄호 ()를 생략할 수 있습니다.