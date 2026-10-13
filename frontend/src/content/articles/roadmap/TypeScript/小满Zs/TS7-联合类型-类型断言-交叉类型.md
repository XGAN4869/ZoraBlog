# TS7：联合类型、类型断言与交叉类型

## 开篇速记卡：`|` 是任选其一，`&` 是同时满足

| 写法           | 名称   | 含义                     |
| ------------ | ---- | ---------------------- |
| `A \| B`     | 联合类型 | 值可以是 A，也可以是 B          |
| `A & B`      | 交叉类型 | 值必须同时满足 A 和 B          |
| `value as T` | 类型断言 | 告诉 TypeScript 按 T 看待该值 |

> [!IMPORTANT]
> 类型断言只影响 TypeScript 的类型检查，不会在运行时真正转换数据。

## 学习目标

这一篇的重点不只是记住三个符号，而是分清它们分别改变了什么：

- 联合类型扩大“可能是哪一种”的范围，但使用前常常需要类型收窄。
- 交叉类型合并“必须同时满足”的要求，但属性冲突可能产生无法赋值的类型。
- 类型断言改变编译器的看法，不会改变运行时真实值。

## 一、联合类型 `|`

### 1. 一个变量支持多种类型

```js
//联合类型：同时支持两种类型 |
let phone:number | string = '1234567890'
```

`phone` 可以保存 `number` 或 `string`，但不能保存联合类型以外的值。

### 2. 函数参数使用联合类型

```js
function func1(type:number | boolean):boolean{
    //强转换
    return !!type
}
console.log(func1(0))
console.log(func1(true))
```

这里的参数可以是 `number` 或 `boolean`。`!!type` 会利用 JavaScript 的真假值规则，将参数转换成布尔值。

> [!NOTE] `!!type` 是运行时转换
> 这里的 `!!` 会在 JavaScript 运行时真正得到布尔值，因此它与后面的 `as string` 不同。`as` 只参与 TypeScript 检查，`!!` 会真正执行。

### 3. 联合类型通常需要先收窄

当一个值可能是多种类型时，只能直接使用这些类型共同拥有的能力。想使用某一种类型独有的方法，需要先判断当前值到底是哪一种。

**补充示例：**

```ts
function printId(id: number | string): void {
  if (typeof id === 'string') {
    console.log(id.toUpperCase())
  } else {
    console.log(id.toFixed(0))
  }
}
```

`typeof` 判断让 TypeScript 在两个分支中分别把 `id` 收窄成 `string` 和 `number`。

## 二、交叉类型 `&`

### 1. 定义两个接口

```js
//交叉类型 &符连接

interface People {
    name: string,
    age: number
}
interface Man {
    sex:number
}
```

### 2. 同时满足两个接口

```js
const zora = (a:People & Man ):void=>{
    console.log(a)
}

zora({
    name:'Zora',
    age:23,
    sex:1
})
```

`People & Man` 表示参数 `a` 必须同时具备：

- `People` 中的 `name`、`age`。
- `Man` 中的 `sex`。

只满足其中一个接口是不够的。

### 3. 交叉类型遇到同名冲突

交叉类型不是简单地把两个对象“覆盖合并”。如果两个类型要求同一个属性同时是互不兼容的类型，最终可能得到 `never`。

**补充示例：**

```ts
type StringId = { id: string }
type NumberId = { id: number }
type ImpossibleId = StringId & NumberId
```

`ImpossibleId['id']` 需要同时是 `string` 和 `number`，普通值无法满足，因此该属性会变成 `never`。这提醒我们：使用 `&` 前要检查同名属性是否兼容。

## 三、类型断言 `as`

### 1. 类型断言的作用与风险

```js
//类型断言 as 不能滥用会导致类型错误
// as any 放弃 ts 类型校验
/**
 *TODO as string
    强制类型转换（只是告诉TS “我确定它就是string”）,
    但也仅仅只是欺骗，并不能做到真实的转换
*/
```

类型断言适合“开发者知道的信息比 TypeScript 更多”的情况。它不会修改真实的数据，也不会自动增加某个属性。

### 2. 使用 `as string`

```js
//写法1
function func2(a:number | string):void {
   console.log((a as string).length) //强制转换类型
};

func2('123') //OK
func2(1); // 不能滥用会导致类型错误
```

当传入 `'123'` 时，字符串确实拥有 `length`。当传入 `1` 时，断言只是让类型检查暂时通过，数字本身并没有真的变成字符串。

> [!WARNING]
> `as string` 不是 `String(a)`。前者只改变 TypeScript 对值的判断，后者才会在运行时进行真实转换。

### 3. `as any` 与分号问题

```js
// 这里以（开头会触发 ts 语法歧义,上面那行要加 ; semicolon
// TODO func2('123')(window as any).abc = '123'
// (window as any).abc = '123'
```

`as any` 会跳过大部分类型检查，应尽量缩小使用范围。当前代码被注释掉，用来记录以括号开头的语句可能与上一行产生语法歧义，因此上一条语句需要用分号明确结束。

### 4. 原文观察：`func2(1)` 不一定抛异常

当前代码把数字断言成字符串后读取 `.length`。在 JavaScript 运行时，数字并没有变成字符串；这个表达式通常会得到 `undefined`，所以日志可能打印 `undefined`，而不是字符串长度。

真正的问题是：TypeScript 已经被断言说服，无法继续提醒这里的逻辑与真实值不一致。

### 5. 断言、收窄和转换的区别

| 操作 | 是否影响类型检查 | 是否改变运行时值 | 示例 |
|---|---|---|---|
| 类型断言 | 是 | 否 | `value as string` |
| 类型收窄 | 是 | 否，先判断真实值 | `typeof value === 'string'` |
| 运行时转换 | 会推断新类型 | 是 | `String(value)`、`Boolean(value)` |

> [!TIP]
> 能用类型判断收窄时，优先收窄；确实要把值转换成另一种数据时，使用真实的转换函数；只有掌握了编译器不知道的信息时才考虑断言。

## 四、三种类型工具对比

### 联合类型

关注“可以是哪一种”：

```ts
type Id = number | string
```

### 交叉类型

关注“必须同时具有什么”：

```ts
type Person = People & Man
```

### 类型断言

关注“开发者告诉编译器怎样看待当前值”：

```ts
const value = someValue as string
```

## 五、`any` 和 `unknown` 的安全边界

`as any` 相当于暂时退出类型检查，后续几乎可以访问任意属性。`unknown` 同样可以接收未知值，但使用前必须先判断，因此更适合表达“我现在还不知道它是什么”。

```ts
function printLength(value: unknown): void {
  if (typeof value === 'string') {
    console.log(value.length)
  }
}
```

这段补充示例没有欺骗编译器，而是先用 `typeof` 证明 `value` 是字符串。

## 复习练习

1. 不使用 `as string`，改用 `typeof` 重写 `func2` 的判断思路。
2. 预测 `func1('0')` 为什么不能通过 TypeScript 检查，而 `func1(0)` 为什么返回 `false`。
3. 思考 `People & Man` 如果都声明一个类型不同的 `age` 属性，会发生什么？

## 参考资料

- [TypeScript Handbook：Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)
- [TypeScript Handbook：Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- [TypeScript Handbook：Intersection Types](https://www.typescriptlang.org/docs/handbook/2/objects.html#intersection-types)

## 一句话总结

> 联合类型扩大可选范围，交叉类型合并类型要求，类型断言则只改变编译器的判断，不改变运行时的真实数据。
