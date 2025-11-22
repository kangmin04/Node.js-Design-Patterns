const myModule =( () => {
    const privateFoo = () => {} 
    const privateBar = [] 

    console.log('INSIDE : ' ,privateFoo, privateBar)

    const exported = {
        publicFoo: () => {},
        publicBar: []
    }
    return exported
}
)()

console.log('Outside:', myModule.privateFoo, myModule.privateBar)
console.log('Module:', myModule)