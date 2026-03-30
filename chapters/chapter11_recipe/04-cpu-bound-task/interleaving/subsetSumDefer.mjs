import {EventEmitter} from 'node:events'

export class SubsetSum extends EventEmitter {
    constructor(sum, set){
        super(); 
        this.sum = sum; 
        this.set = set; 
        this.totalSubsets = 0; 
        
    }

    _combineInterleaved(set, subset){
        this.runningCombine++; 
        setImmediate(() => {
            this._combine(set, subset); 
            //combine 끝나고 종료되면, runningcombine 감소시켜야함. 전부 끝난경우 이를 이벤트로 알려야함. 
            if(--this.runningCombine === 0){
                this.emit('end')
            }
        })
    }

    _combine(set, subset){
        for(let i = 0; i < set.length ; i++){
            const newSubset = [...subset, set[i]]
            this._combineInterleaved(set.slice(i+1),newSubset)
            this.processSubset(newSubset)
        }
    }

    processSubset(subset){
        console.log(`Subset`, ++this.totalSubsets, subset)
        const res = subset.reduce((prev, item) => (prev+item), 0)
        if(res === this.sum){
            this.emit('match', subset)
        }
    }

    start(){
        this.runningCombine = 0; 
        this._combineInterleaved(this.set, []) //combine이 synchronous. -> combine 끝나면 바로 end 이벤트. 
        
    }
}

