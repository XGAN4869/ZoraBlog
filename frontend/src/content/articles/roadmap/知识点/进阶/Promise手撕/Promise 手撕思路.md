**创建 p2 时**
- p1，resolve(10)，此时 this.result 是 10 并且 fulfilled

**①走到了 new Promise, 也就是有了 p2**
如上，p2 是 p1.then 中 new Prmise(resolve,reject) 出来的，【此时还在执行 p1.then】所以这里的【 new Promise 中的 resolveP2】，【此时p2 的 state 是 fulfilled -- 可看②】

**②走 if 判断 this.state:** 
所以 p1.then 把 value 那一串函数给了 onFullFilled，所以 在创建 p2 的时候，由于 this.state 箭头函数 this 还是 p1 的 this，因为是通过 p1.then 调用的，所以执行了handle(onFullFilled)【callback 是 onFullFilled 也就是 value】

**③ 我们发现 result 是 new Promise (.. 也就是 p3**
所以，p3 是 Promise 的实例，于是执行 p3.then( resolveP2 【这里传入的是 p2 的 resolve】

**④ 走p3.then**
( resolveP2 给了 onFullFilled，但p3 的状态是 pending，由于 p2 new 在外层，p3 其实比 p2 的执行时机要早，不过还是 p2 先创建的，所以 p3 pending --> p2 pending，p3 的状态影响 p2 的状态

**⑤**将 resolveP2 存入 onFullFilled, 然后 继续走 return new Promise，这次创建出来一个 p4，虽然 p4 return了，但是 p3.then(resolveP2 ... 后面没有return p4, 所以只是执行了没保存。

**⑥由于p3 pending,**
所以 p3.then 后，then 内部的 this 是指向 p3 的 【之前 p1.then 的 this 是p1 得出的】，所以 onFullFilled 是 result 那一串，也就是 resolveP2，这里先放入了 callbacks 回调队列中

**⑦**然后我们先看 p3 内部的代码（示例代码），他们是会执行的，这里的 resolve 就是 resolveP3, 等1s 后 resolve 执行，resolveP3 执行，value 由于已经从 p1 那里拿过来了，所以 value 也能拿到，等 resolve 执行后， callbacks 执行，那么 resolveP2 执行，再触发 then 后面的成功回调，此时 this.result 拿到的是 p3 的 this.result 是 20, 因为⑥中 p3 的 resolve 存入了 value 是20

