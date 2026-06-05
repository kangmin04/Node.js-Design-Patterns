export class Url{
    // port, pathname, search, hash
    constructor({protocol, username, password, hostname}
       ) {
            this.protocol = protocol
            this.username = username
            this.password = password
            this.hostname = hostname
            // this.port = port
            // this.pathname = pathname
            // this.search = search
            // this.hash = hash
            // this.validate()
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
        }


export class createUrl {
    constructor(){
        this.reset(); 
    }

    reset(){
        this._protocol = null
        this._username = null
        this._password = null
        this._hostname = null
        this._port = null
        this._pathname = null
        this._search = null
        this._hash =null
    }

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
    setAccount(username , password){
        this._username = username ; 
        this._password = password
        return this
    }
    setPort(port) {
        this._port = port
        return this
      }
      setPathname(pathname) {
        this._pathname = pathname
        return this
      }
      setSearch(search) {
        this._search = search
        return this
      }
      setHash(hash) {
        this._hash = hash
        return this
      }


    build(){
        return new Url({
            protocol : this._protocol , 
            username : this._username , 
            password : this._password , 
            hostname : this._hostname , 
        })
        //  return new Url(
        //      this._protocol , 
        //     this._username , 
        //     this._password , 
        //     this._hostname , 
        // )
    }

}


const builderInstance = new createUrl();
const url = builderInstance   //생성될 때부터 build에 의해서 되기에 항상 유효한 상태임
    .setProtocol('https')  
    .setAccount('kim' , '1hvj')
    .setHostname('naver.com')
  
    .build()

console.log(url.toString())