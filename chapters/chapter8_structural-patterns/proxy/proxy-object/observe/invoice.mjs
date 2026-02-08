import { createObservable } from "./create-observable.mjs";

function calculateTotal(invoice){
    return invoice.subtotal - invoice.discount + invoice.tax

}

const invoice = {
    subtotal : 100 , 
    discount: 10,
    tax: 20,
}

let total = calculateTotal(invoice); 
console.log(`Starting total: ${total}`)

const observeInvoice = createObservable(invoice , ({property , prev ,  curr}) => {
    total = calculateTotal(invoice) ; 
    console.log(`TOTAL: ${total} (${property} changed: ${prev} -> ${curr})`)
}) 

observeInvoice.subtotal = 200; 
observeInvoice.discount = 20 // TOTAL: 200
observeInvoice.discount = 20 // no change: doesn't notify
observeInvoice.tax = 30 // TOTAL: 210
console.log(`Final total: ${total}`)