# TS2：运行工具与基础类型

## 开篇速记卡：能具体就具体，不确定就 `unknown`

> **类型写得越具体，编辑器提示越准确；`any` 越多，TypeScript 越接近普通 JavaScript。**

### 类型选择口诀

```text
已经知道是什么     → string / number / boolean / 具体对象
只允许几个固定值   → 字面量联合类型
暂时不知道是什么   → unknown，判断后再使用
不关心函数返回值   → void
函数不能正常结束   → never
实在无法描述       → 最后才考虑 any
```

### 高频类型速查

![[Pasted image 20260821174054.png]]

| 场景   | 写法                       | 记忆点              |
| ---- | ------------------------ | ---------------- |
| 字符串  | `string`                 | 使用小写，不用 `String` |
| 数字数组 | `number[]`               | 每一项都是数字          |
| 普通对象 | `interface User { ... }` | 直接描述结构           |
| 固定状态 | `'idle' \| 'loading'`    | 只能从规定值中选择        |
| 未知数据 | `unknown`                | 先判断，后使用          |
| 跳过检查 | `any`                    | 能不用就不用           |
| 永不返回 | `never`                  | 抛错、死循环、不可能分支     |

### 最容易混淆的三个结论

1. `unknown` 比 `any` 安全，因为它会强制你先判断类型。
2. `{}`类型：可以是**任何不是 null、不是 undefined 的值**。
3. 描述业务对象时，不要用宽泛的 `Object`，应写明确属性或使用 `interface`。

## 分类索引

- [[#一、直接运行 TypeScript|直接运行 TypeScript]]
- [[#二、为什么需要 @types/node|Node.js 类型声明]]
- [[#三、常用基础类型|常用基础类型]]
- [[#四、any、unknown 与 never|特殊类型]]
- [[#五、Object、object 与空对象类型|对象相关类型]]
- [[#六、类型推断与字面量类型|类型推断与字面量类型]]

## 一、直接运行 TypeScript

`ts-node` 可以在开发阶段直接运行 `.ts` 文件，省去手动执行“编译 TS → 运行 JS”两个命令的过程。

### 1. 安装

```bash
npm install --save-dev ts-node typescript
```

### 2. 运行

```bash
npx ts-node index.ts
```

> [!NOTE]
> `ts-node` 适合学习、脚本和开发调试；正式构建仍应根据项目配置执行 `tsc` 或项目构建工具。

## 二、为什么需要 `@types/node`

安装 Node.js 的类型声明：

```bash
npm install --save-dev @types/node
```

Node.js 的运行时 API 是 JavaScript 实现的。`@types/node` 为 `fs`、`path`、`process` 等 API 提供 TypeScript 类型，让编辑器和编译器知道它们有哪些属性与方法。

`-D` 等价于 `--save-dev`，表示这是开发依赖，会记录在 `package.json` 的 `devDependencies` 中。

## 三、常用基础类型

### 1. 原始类型

```ts
const username: string = 'Zora'
const age: number = 23
const isAdmin: boolean = false
const empty: null = null
const missing: undefined = undefined
const id: symbol = Symbol('id')
const bigNumber: bigint = 100n
```

日常开发应使用小写的 `string`、`number`、`boolean`，不要使用包装对象类型 `String`、`Number`、`Boolean`。

### 2. 数组与对象

```ts
const scores: number[] = [80, 90, 100]

const user: { name: string; age: number } = {
  name: 'Zora',
  age: 23,
}
```

### 3. `void`

`void` 常用于表示函数不关心返回值：

```ts
function logMessage(message: string): void {
  console.log(message)
}
```

## 四、`any`、`unknown` 与 `never`

这三种类型不能简单地排成一条“由宽到窄”的直线：`unknown` 是安全的顶层类型，`never` 是底层类型，而 `any` 会绕过大部分类型检查。

### 1. `any`：关闭类型检查

```ts
let value: any = 'hello'
value.notExists() // 编译器通常不阻止，但运行时可能报错
```

只有在迁移旧项目或确实无法确定类型时才使用 `any`。

### 2. `unknown`：先检查，再使用

```ts
function printLength(value: unknown): void {
  if (typeof value === 'string') {
    console.log(value.length)
  }
}

let data: unknown
data = 123         // ✅直接赋值数字，没问题
data = { name:'a' }// ✅直接赋值对象，没问题
data = "hello"     // ✅字符串也可以

// 上面只是把值丢给unknown变量，只是存起来，没有去使用它，不需要任何判断

let data:unknown = {name:'tom'}

// ❌报错，unknown不能直接点属性
console.log(data.name)

// ❌报错，不能直接把unknown赋值给User
const user: User = data
```

`unknown` 可以**接收**任意值，但未经类型缩小，不能直接**访问**属性、调用方法，也不能赋给更具体的类型。
下面这些操作，TS 直接报错，**必须先判断收窄类型**：

1. 访问属性 `data.name`
2. 调用方法 `data.xxx()`
3. 赋值给别的确定类型变量 `const u:User = data`

### 3. `never`：不可能出现的值

```ts
function throwError(message: string): never {
  throw new Error(message)
}
```

`never` 常见于永远抛错的函数、无限循环，以及联合类型的完整性检查。

## 五、`Object`、`object` 与空对象类型

### 1. `Object`（大写）

`Object` 可以接收绝大多数非 `null`、非 `undefined` 的值，范围太宽，日常业务类型中通常不推荐使用。

### 2. `object`（小写）

`object` 表示非原始值，可以是普通对象、数组或函数，但不能是 `string`、`number`、`boolean` 等原始值。

```ts
let data: object
data = { name: 'Zora' }
data = [1, 2, 3]
data = () => true
// data = 123 // 错误：number 是原始类型
```

### 3. `{}` 不是“空对象专用类型”

在 TypeScript 中，`{}` 表示任意非 `null`、非 `undefined` 的值，而不是“必须没有属性的对象”。

```ts
let value: {}
value = 1
value = 'hello'
value = { name: 'Zora' }
// value = null // 开启 strictNullChecks 时错误
```

如果需要描述具体对象，应明确写出属性，或使用 `interface` / `type`：

```ts
interface User {
  name: string
  age: number
}
```

## 六、类型推断与字面量类型

### 1. 类型推断

能让 TypeScript 正确推断时，不必重复标注：

```ts
const count = 1 // 推断为 number
let title = 'TypeScript' // 推断为 string
```

### 2. 字面量类型

字面量类型只允许某个具体值，通常与联合类型一起使用：

```ts
type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

let requestStatus: RequestStatus = 'idle'
requestStatus = 'loading'
// requestStatus = 'done' // 错误：不在 RequestStatus 中
```

## 一句话总结

> 类型未知时优先用 `unknown` 并先缩小类型；尽量避免 `any`；描述对象时写清楚结构，不要把 `Object` 或 `{}` 当成普通对象类型。
