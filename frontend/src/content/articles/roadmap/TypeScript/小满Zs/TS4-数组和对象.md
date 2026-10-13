# TS4：数组、对象数组与元组

## 开篇速记卡：方括号每多一层，数组就多一层

> **`T[]` 是一组 T，`T[][]` 是一组“T 数组”；元组则是给每个位置安排固定座位。**

```text
number       → 一个数字
number[]     → 一组数字
number[][]   → 一组“数字数组”
[string, number] → 第 0 位字符串，第 1 位数字
```

### 平时即看即用

```ts
const ids: number[] = [1, 2, 3]

interface User {
  name: string
  age: number
}

const users: User[] = [{ name: 'Zora', age: 23 }]
const table: number[][] = [[1, 2], [3, 4]]
const userInfo: [string, number] = ['Zora', 23]

function sum(...numbers: number[]): number {
  return numbers.reduce((total, item) => total + item, 0)
}
```

### 选择口诀

- 元素类型相同、数量不固定：用数组 `T[]`。
- 每个位置含义和类型固定：用元组 `[A, B]`。
- 接收任意数量的函数参数：用剩余参数 `...args`。
- 新代码优先使用剩余参数，不优先使用 `arguments`。

## 分类索引

- [[#一、数组的两种类型写法|数组类型]]
- [[#二、对象数组|对象数组]]
- [[#三、多维数组|多维数组]]
- [[#四、元组|元组]]
- [[#五、剩余参数与 arguments|剩余参数与 arguments]]

## 一、数组的两种类型写法

### 1. `类型[]`

```ts
const numbers: number[] = [1, 2, 3, 4]
const names: string[] = ['Zora', 'Fanny']
```

### 2. `Array<类型>`

```ts
const flags: Array<boolean> = [true, false]
const scores: Array<number> = [80, 90, 100]
```

两种写法含义相同。简单类型通常使用 `number[]`，嵌套泛型较多时可以选择更容易阅读的写法。

## 二、对象数组

先用 `interface` 描述单个对象，再在类型后加 `[]`：

```ts
interface User {
  name: string
  age: number
}

const users: User[] = [
  { name: 'Zora', age: 23 },
  { name: 'Zayne', age: 27 },
]
```

阅读 `User[]` 时，可以理解成“数组中的每一项都必须符合 `User` 接口”。

## 三、多维数组

### 1. 二维数组

二维数组可以理解为“数组里面的每一项仍然是数组”，常用于表格、矩阵和棋盘数据。

```ts
const matrix: number[][] = [
  [10, 20], // 第 0 行
  [30, 40], // 第 1 行
  [50, 60], // 第 2 行
]

console.log(matrix[1][1]) // 40
```

`number[][]` 的拆解方式：

```text
number      一个数字
number[]    一组数字
number[][]  一组“数字数组”
```

### 2. 三维数组

```ts
const cube: number[][][] = [
  [[1, 2]],
  [[3, 4]],
]
```

三维及以上数组在普通业务中较少手写，可能出现在图像像素、空间坐标或科学计算数据中。

## 四、元组

元组也是数组，但它规定了元素数量以及每个位置的类型：

```ts
const userInfo: [string, number] = ['Zora', 23]

const userName = userInfo[0] // string
const userAge = userInfo[1] // number
```

数组与元组的区别：

| 类型 | 特点 | 示例 |
|---|---|---|
| 数组 | 所有元素通常是同一类，长度可变 | `number[]` |
| 元组 | 每个位置的类型已知，长度通常固定 | `[string, number]` |

## 五、剩余参数与 `arguments`

### 1. 推荐：剩余参数

```ts
function sum(...numbers: number[]): number {
  return numbers.reduce((total, current) => total + current, 0)
}

sum(1, 2, 3)
```

`...numbers` 会把调用时传入的多个参数收集成真正的数组，所以可以直接使用 `map`、`filter`、`reduce` 等数组方法。

### 2. `arguments` 是类数组对象

```ts
function printArgs(): void {
  const args: IArguments = arguments
  console.log(args.length)
  console.log(args[0])
}
```

`arguments` 有索引和 `length`，但不是真正的数组。现代 TypeScript 代码更推荐使用剩余参数，因为类型更清晰、数组方法也更方便。

`IArguments` 的结构可以简化理解为：

```ts
interface SimpleArguments {
  readonly length: number
  [index: number]: unknown
}
```

> [!NOTE]
> 箭头函数没有自己的 `arguments`，需要接收任意数量参数时应使用剩余参数。

## 一句话总结

> `T[]` 表示由 `T` 组成的数组，`T[][]` 表示数组中再放 `T[]`；位置和长度固定的数据可以使用元组。
