# TS5：函数类型与对象方法

## 开篇速记卡：函数类型只看入口和出口

> **参数是函数的入口类型，返回值是函数的出口类型。先看传什么，再看返回什么。**

```ts
function add(
  a: number, // 入口：必须传入 number
  b: number, // 入口：必须传入 number
): number {  // 出口：必须返回 number
  return a + b
}
```

### 高频符号速查

| 写法              | 含义            | 记忆点                |
| --------------- | ------------- | ------------------ |
| `name: string`  | 必填参数          | 调用时必须传             |
| `name?: string` | 可选参数          | 内部可能拿到 `undefined` |
| `count = 0`     | 默认参数          | 不传时使用默认值           |
| `(): void`      | 不关心返回值        | 常用于事件、日志           |
| `(): never`     | 永远不能正常返回      | 抛错或无限循环            |
| `this: Obj`     | 检查方法中的 `this` | 编译后会被删除            |

### 平时可直接套用的函数模板

```ts
interface User {
  id: number
  name: string
}

function getUser(id: number, keyword?: string): User {
  const name = keyword ?? '默认用户'
  return { id, name }
}
```

> [!TIP]
> 记忆口诀：**必填直接写，可选加问号，缺省给默认，没结果用 void。**

## 分类索引

- [[#一、函数参数与返回值|参数与返回值]]
- [[#二、可选参数与默认参数|可选参数与默认参数]]
- [[#三、对象作为参数|对象参数]]
- [[#四、函数类型|函数类型]]
- [[#五、对象方法中的 this|对象方法与 this]]
- [[#六、常见返回值类型|常见返回值类型]]

## 一、函数参数与返回值

### 1. 普通函数

```ts
function addNumbers(a: number, b: number): number {
  return a + b
}

console.log(addNumbers(1, 2))
```

`a: number` 和 `b: number` 规定参数类型，函数括号后的 `: number` 规定返回值类型。

### 2. 箭头函数

```ts
const addArrow = (a: number, b: number): number => a + b
```

当返回值可以被准确推断时，也可以省略返回值标注：

```ts
const addInferred = (a: number, b: number) => a + b
```

## 二、可选参数与默认参数

### 1. 可选参数 `?`

```ts
function greet(name: string, title?: string): string {
  return title ? `${title} ${name}` : name
}
```

可选参数可能是 `undefined`，使用前要先处理。可选参数通常放在必填参数后面。

### 2. 默认参数

```ts
function addWithDefault(a: number, b: number = 20): number {
  return a + b
}

addWithDefault(2) // 22
addWithDefault(2, 3) // 5
```

没有传入 `b` 或传入 `undefined` 时，`b` 会使用默认值 `20`。

### 3. 不要直接计算可能为 `undefined` 的值

```ts
function addOptional(a?: number, b: number = 20): number {
  return (a ?? 0) + b
}
```

在严格模式下，直接写 `a + b` 会报错，因为可选参数 `a` 可能是 `undefined`。

## 三、对象作为参数

```ts
interface User {
  name: string
  age: number
}

function formatUser(user: User): string {
  return `${user.name}，${user.age} 岁`
}

formatUser({ name: 'Zora', age: 23 })
```

复杂对象建议先定义 `interface` 或 `type`，这样类型可以复用，也更容易阅读。

## 四、函数类型

### 1. 使用类型别名

```ts
type Calculator = (a: number, b: number) => number

const multiply: Calculator = (a, b) => a * b
```

### 2. 使用接口

```ts
interface Calculator {
  (a: number, b: number): number
}

const subtract: Calculator = (a, b) => a - b
```

当变量已经标注了完整的函数类型时，函数实现中的参数类型可以由上下文推断。

## 五、对象方法中的 `this` vue3 中用的少

```ts
interface Counter {
  values: number[]
  add(this: Counter, value: number): void
}

const counter: Counter = {
  values: [1, 2, 3],

  add(value) {
    this.values.push(value)
  },
}

counter.add(4)
console.log(counter.values) // [1, 2, 3, 4]
```

这里需要区分两部分：

- `interface Counter` 规定对象必须有 `values` 和 `add`。
- `counter` 创建真正的对象并实现 `add`。
- `this: Counter` 只用于类型检查，编译后会被删除，调用时不用传入。
- `counter.add(4)` 使用“对象.方法()”的形式调用，所以方法中的 `this` 指向 `counter`。

更详细的拆解见：[[TS6-函数重载|TypeScript 中的 Obj、对象方法与 this]]。

## 六、常见返回值类型

### 1. 返回具体值

```ts
function getName(): string {
  return 'Zora'
}
```

### 2. 不关心返回值：`void`

```ts
function logName(name: string): void {
  console.log(name)
}
```

### 3. 永远不能正常结束：`never`

```ts
function fail(message: string): never {
  throw new Error(message)
}
```

## 一句话总结

> 函数类型主要描述“接收什么参数、返回什么结果”；对象方法还可能需要描述运行时的 `this`。
