const p1 = new Promise((resolve , reject) => {
    resolve(1)
})
const p2 = new Promise((resolve , reject) => {
    resolve(2)
})
const p3 = new Promise((resolve , reject) => {
    reject('reject!! donedone')
})
const p4 = new Promise((resolve , reject) => {
    resolve(4)
})


const data = Promise.all([p1,p2,p3,p4])

data.then((res) => {
    console.log(res)
}).catch(err => console.log(err))