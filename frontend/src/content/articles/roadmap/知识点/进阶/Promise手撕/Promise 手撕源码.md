```js
import {resolve} from "node:dns";

class Promise {
    constructor(executor) {
        this.state = 'pending'
        this.result = undefined
        this.callbacks = []

        function resolve(value) {
            if (this.state !== 'pending') return
            this.state = 'fulfilled'
            this.result = value
            //存放了 pending 状态下的所有回调, 来源于 then 方法中的 this.callback.push
            //TODO 所有.then()函数本身是同步执行，所以会把console.log等主线程内容执行完，再执行
            this.callbacks = (cb => cb.onFullFilled())
        }

        function reject(value) {
            if (this.state !== 'pending') return
            this.state = 'reject'
            this.result = value
            //存放了 pending 状态下的所有回调, 来源于 then 方法中的 this.callback.push
            this.callbacks = (cb => cb.onRejected())
        }

        try {
            executor(resolve, reject)
        } catch (err) {
            throw Error(err)
        }
    }

    then(onFullFilled, onRejected) {
        //TODO 值穿透, 只是赋值，函数不会跑！参数 v 根本没有接收过任何真实数据
        onFullFilled = (typeof onFullFilled === 'function') ? onFullFilled : v => v
        onRejected = (typeof onRejected === 'function') ? onRejected : r => throw r

        //TODO then 永远返回一个 new 全新的 promise 实例，用来链式调用，内层的 this 指向这一层，是老的 promise，因为内层都是箭头函数
        //P2 resolveP2 resolveP2
        //p4
        return new Promise((resolve, reject) => {
            const handle = (callback) => { //callback = onFullFilled / onRejected
                //✅2. 将回调函数放入微任务队列，不会立即执行，会等当前主线程同步代码全部跑完之后，才执行
                queueMicrotask(() => {
                    try {
                        //✅TODO 执行值穿透函数，把旧promise 的 result 给了 新 promise的 value 参数，也就是 then 后面的 (value)=>{...}
                        const result = callback(this.result)
                        if (result instanceof Promise) {
                            //P3
                            result.then(resolve, reject)
                            //P4: 但是 then 完了之后没有return 保存
                        }
                        else {
                            resolve(result)
                        }
                    } catch (err) {
                        reject(err)
                    }
                })

            }

            //this 是上一次的 promise 实例
            // 等待 1 秒，定时器触发，执行 `oldP.resolve(100)`，这时才执行 handle
            if (this.state === 'fulfilled') {
                handle(onFullFilled) //✅1. 真正执行
                return // ✅直接跳出executor，不再执行下面push
            }
            if (this.state === 'reject') {
                handle(onRejected)
                return // ✅直接跳出executor，不再执行下面push
            }

            // ⛔3. 只有 pending 才会跑到这里执行push
            this.callbacks.push({
                onFullFilled: () => handle(onFullFilled),
                onRejected: () => handle(onRejected)
            })

        })

    }

    reject() {
    }

    resolve() {
    }
}
```