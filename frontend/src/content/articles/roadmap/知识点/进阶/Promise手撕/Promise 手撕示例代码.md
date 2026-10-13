```js
// P1：最开始的旧 Promise
const p1 = new Promise((resolve, reject) => {
    resolve(10); // p 的状态立即变为 fulfilled，result = 10
});
//P2：第一次调用 then 返回的 Promise
const p2 = p1.then((value) => {
    /**
     * P3：此时，又来了一个 Promise, 状态是 pending
     * P3.then(resolveP2,rejectP2);
     * so, resolveP3 并没有被放入 then()中作为参数执行
     * P3 的状态 → 驱动 P2 的状态
     */
    const p3 = new Promise((resolve) => {
        setTimeout(() => {
            resolve(value * 2); // 1 秒后 resolve 20
        }, 1000);
    });
    return p3;
})

//resolveP2执行后，执行微任务队列，执行 then
p2.then((result) => {
    console.log(result); // 1 秒后打印 20
})

```