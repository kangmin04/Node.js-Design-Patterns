export class LazyPromise extends Promise { // 1
    #resolve //private member
    #reject      
    #executor
    #promise
    constructor(executor) { // 3
      let _resolve
      let _reject
      super((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      }) 
      //super 호출이 끝나야만, this를 사용할 수 있다. !! 
      this.#resolve = _resolve
      this.#reject = _reject
      this.#executor = executor 
      this.#promise = null
    }
    #ensureInit() { // 4
      if (!this.#promise) {
        this.#promise = new Promise(this.#executor)
        this.#promise.then(
          v => this.#resolve(v),
          e => this.#reject(e)
        )
      }
    }
    then(onFulfilled, onRejected) { // 5
      this.#ensureInit()
      return this.#promise.then(onFulfilled, onRejected)
    }
    catch(onRejected) {
      this.#ensureInit()
      return this.#promise.catch(onRejected)
    }
    finally(onFinally) {
      this.#ensureInit()
      return this.#promise.finally(onFinally)
    }
  }

  // const lazyPromise = new LazyPromise(resolve => { // 1
  //   console.log('Executor Started!')
  //   // simulate some async work to be done
  //   setTimeout(() => {
  //     resolve('Completed!')
  //   }, 1000)
  // })
  // console.log('Lazy Promise instance created!')
  // console.log(lazyPromise)
  // lazyPromise.then(value => { // then is invoking executor function  !! 
  //   console.log(value)
  //   console.log(lazyPromise)
  // })

  const normalPromise = new Promise((resolve, reject) => {
    console.log('Executor Started!')
      // simulate some async work to be done
      setTimeout(() => {
        resolve('Completed!')
      }, 1000)
  })
    console.log('Promise instance created!')
  console.log(normalPromise)