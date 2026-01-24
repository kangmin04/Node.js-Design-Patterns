class Profiler {
    constructor(label){
        this.label = label; 
        this.lastTime = null; 
    }

    start(){
        this.lastTime = process.hrtime()
    }

    end(){
        const diff = process.hrtime(this.lastTime)
        console.log(`Timer "${this.label}" took ${diff[0]} seconds ` +
        `and ${diff[1]} nanoseconds.`)
  }
}

const noopProfile = {
    start() {} , 
    end () {}
}

//IMPLEMENTATION  , OBJECT 분리 장점 
export function createProfiler(label){
    if(process.env.NODE_ENV === 'production'){
        return noopProfile ; 
    }

    return new Profiler(label); 
}
