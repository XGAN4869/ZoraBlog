### 高频
1. Record 作用：**构造一个对象类型，键是 KeyType，值是 ValueType**。
```ts
// 键是string，值是number
type Obj = Record<string, number>
const a:Obj = { a:1, b:2 }

延展
export type Recordable<T = any> = Record<string, T>
```