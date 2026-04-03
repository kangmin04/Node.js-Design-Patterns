import {Level} from 'level'
const db = new Level('sales', {valueEncoding: 'json'})

export function totalSales(product, callback) {
    const now = Date.now()
    let sum = 0;
    const iterator = db.iterator(); 
    
    iterator.on('data', (data) => {
        const [_transactionId, transcation] = data
        if(!product || transcation.product === product){
            sum += transcation.amount
        }
    })

    iterator.on('end' , () => {
        console.log(`totalSales() took: ${Date.now() - now}ms`)
        callback(null, sum);
    })

    iterator.on('error', (err) => {
        callback(err, null);
    })
}


/* db.iterator()은 readable stream. 
readable stream은 eventEmitter을 상속함. 
->  */