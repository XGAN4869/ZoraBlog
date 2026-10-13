# TS3：Interface 接口

## 开篇速记卡：接口是规则，不是对象

> **`interface` 负责规定“必须有什么”，对象负责真正提供这些内容。**

```ts
interface User {
  readonly id: number // 有这个属性，但不能重新赋值
  name: string        // 必须有
  age?: number        // 可以没有
}

const user: User = {
  id: 1,
  name: 'Zora',
}
```

### 五个符号快速记忆

| 写法                 | 一句话记忆             |
| ------------------ | ----------------- |
| `name: string`     | 必须有，而且必须是字符串      |
| `age?: number`     | 可以没有，有就必须是数字      |
| `readonly id`      | 可以读取，不能重新赋值       |
| `A extends B`      | A 在 B 的基础上继续增加规定  |
| `[key: string]: T` | 属性名不确定，但属性值必须符合 T |

### 平时可直接套用的模板

```ts
interface ApiUser {
  readonly id: number
  username: string
  nickname?: string
}

interface AdminUser extends ApiUser {
  permissions: string[]
}
```

> [!TIP]
> 记忆口诀：**冒号管类型，问号管有无，readonly 管修改，extends 管继承。**

## 分类索引

- [[#一、interface 的基本作用|interface 基础]]
- [[#二、可选属性、只读属性与索引签名|属性修饰与索引签名]]
- [[#三、接口继承|接口继承]]
- [[#四、同名接口合并|同名接口合并]]
- [[#五、用接口描述函数|函数接口]]
- [[#六、interface 与 type 的简单选择|interface 与 type]]

## 一、`interface` 的基本作用

`interface` 用于规定对象应该具有什么结构，只参与类型检查，不会创建真实对象。

```ts
interface User {
  name: string
  age: number
}

const user: User = {
  name: 'Zora',
  age: 23,
}
```

可以理解为：

> `interface` 是对象的“结构说明书”，对象本身才是真正运行的数据。

## 二、可选属性、只读属性与索引签名

### 1. 可选属性 `?`

```ts
interface User {
  name: string
  age?: number
}

const user: User = { name: 'Zora' }
```

`age?: number` 表示 `age` 可以不存在；如果存在，就必须是 `number`。

### 2. 只读属性 `readonly`

```ts
interface User {
  readonly id: number
  name: string
}

const user: User = { id: 1, name: 'Zora' }
// user.id = 2 // 错误：id 是只读属性
```

> [!NOTE]
> `readonly` 默认是浅只读，只限制该属性重新赋值，不会自动让所有嵌套属性都变成只读。

### 3. 索引签名

属性名不固定时，可以使用索引签名：

```ts
interface Dictionary {
  [key: string]: string | number
}

const info: Dictionary = {
  name: 'Zora',
  age: 23,
}
```

索引签名的值类型会约束接口中的所有对应属性，因此应尽量写成明确的联合类型，避免直接使用 `any`。

## 三、接口继承

`extends` 可以在已有接口的基础上增加属性：

```ts
interface Employee {
  employeeId: number
}

interface Manager extends Employee {
  name: string
  department: string
}

const manager: Manager = {
  employeeId: 1001,
  name: 'Zora',
  department: 'Frontend',
}
```

`Manager` 继承了 `Employee`，所以对象必须同时提供父接口和子接口要求的属性。

## 四、同名接口合并

同一作用域中的同名接口会自动合并：

```ts
interface Account {
  username: string
}

interface Account {
  token: string
}

const account: Account = {
  username: 'Zora',
  token: 'abc123',
}
```

这叫作声明合并。它是 `interface` 的特点之一；`type` 不能用同名方式重复声明。

## 五、用接口描述函数

接口也可以规定函数的参数和返回值：

```ts
interface GetScores {
  (name: string): number[]
}

const getScores: GetScores = (name) => {
  console.log(name)
  return [80, 90, 100]
}
```

还可以使用方法签名描述对象方法：

```ts
interface Calculator {
  add(a: number, b: number): number
}
```

## 六、`interface` 与 `type` 的简单选择

| 场景 | 更直观的选择 |
|---|---|
| 描述普通对象结构 | `interface` |
| 需要继承对象结构 | 两者都可以，`interface extends` 更直观 |
| 联合类型 | `type` |
| 元组或基础类型别名 | `type` |
| 需要同名声明合并 | `interface` |

```ts
type RequestStatus = 'idle' | 'loading' | 'success' | 'error'
```

> [!TIP]
> 初学阶段可以先记住：对象结构优先考虑 `interface`，联合类型和类型别名使用 `type`。

## 常见错误示例

```ts
interface User {
  readonly id: number
  name: string
}

const user: User = { id: 1, name: 'Zora' }

// user.id = 999
// 错误：不能修改只读属性

// const incomplete: User = { id: 2 }
// 错误：缺少必填属性 name
```
