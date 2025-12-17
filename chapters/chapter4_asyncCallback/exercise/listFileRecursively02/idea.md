List files recursively: 
Write listNestedFiles(), 
- cb style
- input -> directory url (absolute)
- asynchronously iterates over all the subdirectories 
- return a list of all the files discovered
- function listNestedFiles (dir, cb) { /* ... */ }
- avoid callback hell.  create additional helper functions if needed.


function listNestedFiles(dir , cb) {  //dir -> 'chapters/cahpter4_asyncCallback/exercise'
    fs.readDir 의 옵션에 recursiver가 존재함 ... 

}



chapter4를 currentUrl로 readdir 등록해두고 , 완료 시 콜백 등록 
함수 종료 후 
완료 되면 콜백 
가져온 files(해당 폴더 바로 하위의 서브 디렉토리)

다시 재귀적 호출 
두개 등로 ㄱ.... 
listNestFIles(chapter4/바로 하위 폴더 ) -> 완료 시 콜백 다시 .... 
listNestFIles(chapter4/바로 하위 폴더 )

exercise 에서ㅏ 
fileconcat 폴더 들어가고 -> 재귀 시 
5개 파일이 for 돌고 전부 isDirtory false여서 넘어감 
listFileRecur도 파일 두개 확인하고 전부 isDIr -> 넘억ㅁ 


iterator로 진행 시.//// 

iterator(0)호출 =-> function iterator(){
    readdir 로 비동기 ...
    비동기마지막에 iterator(++) 
}