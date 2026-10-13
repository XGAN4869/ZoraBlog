### why 不能用 interface？ 
因为 interface 只能在同一文件下声明才能合并，这里 declare 的目的就是进入同一 axios 模块
```ts

declare module 'axios' {
    interface InternalAxiosRequestConfig { // 现在在同一个模块内了！
    loading?: boolean
  }
}

```