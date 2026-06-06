export function levelSubscribe(db){
    db.subscribe = (pattern , listener) => {
        db.on('write' , docs => {
            // console.log('object.keys : ' , Object.keys(pattern)) -> [ 'doctype', 'language' ]
            // console.log('docs : ' , docs)
            for (const doc of docs){
                const match = Object.keys(pattern).every(
                    k => pattern[k] === doc.value[k] // k : doctype , language들어감
                    //pattern[doctype] ->message ..
                )
                if(match){
                    listener(doc.key, doc.value) 
                }
            }
        })
    }

    return db; 
}
/*
    docs - [{} , {}] 형태로 받음.
    value: { doctype: 'message', text: 'Hi', language: 'en' },
*/