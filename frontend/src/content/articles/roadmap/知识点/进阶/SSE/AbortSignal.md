
## 闭包 or shallowRef?
https://developer.mozilla.org/zh-CN/docs/Web/API/AbortSignal
- 本质其实一样，都是 abort 旧的，然后创造新的实例，(因为旧的需要fetch 中断，而 abort 又是永久中断)，所以要创造新的实例来中断新一轮的 fetch
- 区别：看你需不需要响应式用 {{}} 模板、computed、watch、watchEffect
- GC：❓担心 controller 实例 abort 后会不会产生堆积？
	1. JavaScript 的垃圾回收是**基于引用计数和标记清除**的：当一个对象不再被任何变量或正在执行的上下文引用时，它就会被回收。
	2. 为了防止用户 fetch 的同时 切换页面，需要 onUnmounted
```js
let controller = null

async function query() {
  // 上一次还没结束，先取消旧请求
  controller?.abort()
  // 重新创建实例
  controller = new AbortController() 
  await fetch(url, { signal: controller.signal })
}

onUnmounted(()=>{
  controller?.abort()
})
```