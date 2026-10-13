# TypeScript 基础目录
✅**TS 专属的类型语法（interface、type、类型注解、泛型、as 断言）编译全部擦除，运行时不存在。**
## 开篇速记卡：TypeScript 到底在管什么

> **JavaScript 决定代码怎么运行，TypeScript 提前检查这样运行安不安全。**

把 TypeScript 概括成三个问题：

```text
变量里能放什么？  → 基础类型、数组、联合类型
对象必须有什么？  → interface / type
函数接收什么、返回什么？ → 参数类型、返回值类型
```

>[!HINT]
>补充：
>1. 基础/原始类型(小写的那个，大写的是对象包装类，几乎不拿出来当类型用)但是 Object 和 object：代表非原始类型, 只要是 普通对象 or 数组 都OK。（但是 object 太宽泛，描述具体的对象不要用 interface / type，他们内部可以定义属性）
>2. 数组(a series of 基础类型变量)
>3. 联合类型(允许多种类型, 用 | 隔开)

```ts

// 1. 能明确类型，就写明确类型
const userName: string = 'Tom'
const userAge: number = 18

// 2. 用户对象结构会重复出现，所以定义 interface
interface User {
  id: number
  name: string
  role: Role
}

// 3. 如果数据来自接口、接口返回什么暂时不知道，就用 `unknown`：
const responseData: unknown = await fetchUser()

// 4. role 只有这几个固定选项,字面量联合类型。
type Role = 'admin' | 'user' | 'guest'

// 5. 输入：User  输出：string
function getUserName(user: User): string {
  return user.name
}
//输入：User  输出：void，表示没有返回值
function printUser(user: User): void {
  console.log(user.name)
}

```

>[!HINT]
>2. resonseData 的数据得先判断是否是 User 的对象

+ 补充3
	```js
	type Role = "admin" | "user" | "guest"
	
	interface User {
	  id: number
	  name: string
	  role: Role
	}
	
	declare function fetchUser(): Promise<unknown>
	
	function isUser(obj: unknown): obj is User {
	  if(typeof obj !== 'object' || obj === null) return false
	  const o = obj as User
	  return typeof o.id === 'number'
	    && typeof o.name === 'string'
	    && ['admin','user','guest'].includes(o.role)
	}
	
	async function main(){
	  const responseData: unknown = await fetchUser()
	
	  if(isUser(responseData)){
	    // 类型收窄成功，responseData 变成 User
	    console.log(responseData.name, responseData.role)
	  }else{
	    console.log("返回的数据不是合法用户对象")
	  }
	}
	```

### 类型安全速记

1. 能明确类型，就写明确类型。
2. 类型未知，用 `unknown`，判断后再操作。
3. 对象结构重复出现，用 `interface`。
4. 多个固定选项，用字面量联合类型。
5. 函数重点看“输入”和“输出”。
6. `any` 不是万能类型，而是暂时放弃类型检查。

### 高频写法一屏速查

```ts
const userName: string = 'Zora'
const scores: number[] = [80, 90]

interface User {
  readonly id: number
  name: string
  age?: number
}

type Status = 'idle' | 'loading' | 'success' | 'error'

function getUser(id: number): User {
  return { id, name: 'Zora' }
}
```

## 分类索引

### 一、环境、编译与运行

- [[TS1-ts启动#一、TypeScript 的工作流程|TypeScript 的工作流程]]
- [[TS1-ts启动#二、推荐的项目内安装方式|安装 TypeScript]]
- [[TS1-ts启动#三、编译并运行第一个 TS 文件|编译并运行]]
- [[TS1-ts启动#四、监听模式|监听编译]]
- [[TS2-ts启动-基本类型#一、直接运行 TypeScript|使用 ts-node 直接运行]]
- [[TS2-ts启动-基本类型#二、为什么需要 @types/node|Node.js 类型声明]]

### 二、基础类型与类型安全

- [[TS2-ts启动-基本类型#三、常用基础类型|常用基础类型]]
- [[TS2-ts启动-基本类型#四、any、unknown 与 never|any、unknown 与 never]]
- [[TS2-ts启动-基本类型#五、Object、object 与空对象类型|Object、object 与 `{}`]]
- [[TS2-ts启动-基本类型#六、类型推断与字面量类型|类型推断与字面量类型]]

### 三、对象结构与接口

- [[TS3-Interface#一、interface 的基本作用|interface 基础]]
- [[TS3-Interface#二、可选属性、只读属性与索引签名|可选、只读与索引签名]]
- [[TS3-Interface#三、接口继承|接口继承]]
- [[TS3-Interface#四、同名接口合并|同名接口合并]]
- [[TS3-Interface#五、用接口描述函数|函数接口]]

### 四、数组、对象与集合结构

- [[TS4-数组和对象#一、数组的两种类型写法|数组类型]]
- [[TS4-数组和对象#二、对象数组|对象数组]]
- [[TS4-数组和对象#三、多维数组|多维数组]]
- [[TS4-数组和对象#四、元组|元组]]
- [[TS4-数组和对象#五、剩余参数与 arguments|剩余参数与 arguments]]

### 五、函数与 this

- [[TS5-function#一、函数参数与返回值|函数参数与返回值]]
- [[TS5-function#二、可选参数与默认参数|可选参数与默认参数]]
- [[TS5-function#三、对象作为参数|对象参数]]
- [[TS5-function#四、函数类型|函数类型]]
- [[TS5-function#五、对象方法中的 this|对象方法与 this]]
- [[TS6-函数重载#四、重点：this: Obj 是什么？|显式 this 参数详解]]
- [[TS6-函数重载#八、这和 Vue 2、Vue 3 有什么关系？|this 与 Vue 的关系]]

## 建议学习顺序

1. 先学会安装、编译和运行 TypeScript。
2. 掌握基础类型，以及 `any`、`unknown`、`never` 的区别。
3. 使用 `interface` 描述对象结构。
4. 学习数组、对象数组、元组和多维数组。
5. 最后学习函数签名、可选参数、返回值和 `this`。

## 一句话理解 TypeScript

> TypeScript = JavaScript + 静态类型检查。类型主要在开发和编译阶段帮助发现错误，编译后的 JavaScript 才会真正运行。
