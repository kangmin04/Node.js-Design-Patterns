export class Url{
    constructor(protocol, username, password, hostname,
        port, pathname, search, hash) {
            this.protocol = protocol
            this.username = username
            this.password = password
            this.hostname = hostname
            this.port = port
            this.pathname = pathname
            this.search = search
            this.hash = hash
            this.validate()
        }

        validate() {
            if (!(this.protocol && this.hostname)) {
              throw new Error('Must specify at least a protocol and a hostname')
            }
          }
          toString() {
            let url = ''
            url += `${this.protocol}://`
            if (this.username && this.password) {
              url += `${this.username}:${this.password}@`
            }
            url += this.hostname
            if (this.port) {
              url += this.port
            }
            if (this.pathname) {
              url += this.pathname
            }
            if (this.search) {
              url += `?${this.search}`
            }
            if (this.hash) {
              url += `#${this.hash}`
            }
            return url
          }



        //IF URL 클래스내에 해당 로직 정의 시 ( 분리 안된 경우 !! )
        /*
            setProtocol(protocol){
              if(!protocol){
                  throw new Error('Must specify protocol plz')
              }
              this._protocol = protocol;
              return this
            }
          
          setHostname(hostname){
              if(!hostname){
                  throw new Error('Must specify hostname plz')
              }
              this._hostname = hostname;
              return this
          }
          */

          //=> URL 객체 생성 이후에도 모든 함수가 설정되기 전까지 일관성이 꺠진 상태가 됨.. 
          
}

const badUrl = new Url('https', 'kim','12' , 'example.com', null, null, null, null)
if(badUrl.validate){
    console.log(badUrl.toString())
}

