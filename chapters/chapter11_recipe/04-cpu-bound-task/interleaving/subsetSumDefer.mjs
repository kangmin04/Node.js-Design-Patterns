/*
    인터리빙 방식! 
    원리: 거대한 재귀 루프나 루프 블록 단계마다 setImmediate()를 끼워 넣음
    코드 특징: 연산을 한 단계 진행한 후 다음 단계로 넘어가기 전에 setImmediate(() => this._run(...)) 형태로 제어권을 이벤트 루프에 한 번 양보(Yield)함. 
    실무적 의의: 새로운 프로세스나 스레드를 생성하는 오버헤드가 전혀 없으므로 리소스가 매우 절약된다. 
              연산이 도는 중에도 서버가 다른 유저의 간단한 요청(예: 로그인, 헬스체크)을 중간중간 처리(Interleaving)해 줄 수 있게 됨.
              다만, 전체 연산 완료 시간 자체는 대기 시간 때문에 오히려 늘어납니다.
*/


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

