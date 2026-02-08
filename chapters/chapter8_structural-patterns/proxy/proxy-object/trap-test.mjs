let target = {
    name : 'kim' , 
    country : 'korea'
}


let handler = {
    get(target , property){
        console.log('get handler : target -> ' , target)
        console.log('get property -> ' , property)
        //return 해야함. 
        return target[property]
    } , 
    set(target , property , value){
        console.log(target)
        console.log(property)
        console.log(value)
        target[property] = value; 
        return true //값을 성공적으로 쓴 경우 -> true를 반환해야함. 
    } , 
    deleteProperty(target , property) {
        // console.log('you can not delete user name')
        // return false

        console.log('you are deleting user name')
        return true
    }
}

const test = new Proxy(target , handler); 
// console.log('main code : get country-> ' ,  test.country) 

//const {proxy , revoke}= new Proxy.revocable(target , handler)

try{

    console.log('main code . set name kim to lee : ')
    test.name = 'lee'
    
    console.log('try deleting')
    delete test.name; 
    console.log('deleted' , test.name)
    
}catch(err){
    console.log('ERROR LOGIC')
    console.log(err)
}