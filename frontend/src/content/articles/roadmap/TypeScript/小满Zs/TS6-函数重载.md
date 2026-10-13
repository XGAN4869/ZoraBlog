# TS6：函数重载

## 开篇速记卡：同一个函数，多种调用方式

> **函数重载就是先写出多种合法的调用方式，再用一个统一的函数实现处理它们。**

本例中的 `findUser` 有三种调用方式：

| 调用方式 | 参数 | 功能 | 返回值 |
|---|---|---|---|
| `findUser()` | 不传参数 | 查询全部 | `number[]` |
| `findUser(1)` | 传入数字 | 查询指定数字 | `number[]` |
| `findUser([4,5])` | 传入数组 | 添加数据 | `number[]` |

## 学习目标

读完这一篇，需要能够回答三个问题：

1. 重载签名和真正执行的函数体有什么区别？
2. TypeScript 编译器如何检查调用，JavaScript 运行时又如何选择分支？
3. 什么情况下应该使用函数重载，什么情况下联合类型已经足够？

## 一、准备用户数据

```js
//函数重载reload -- 根据不同的参数决定不同的功能

let user:number[] = [1,2,3]
```

`user` 是后续查询和添加操作使用的原始数组。

## 二、定义函数重载

### 1. 写出三种调用签名

```js
//定义函数重载功能
function findUser(add:number[]):number[] //传数组，做添加
function findUser(index:number):number[] //传数字，查数字
function findUser():number[] //传空，查全部
```

这三行叫作**重载签名**，它们只负责告诉 TypeScript：这个函数允许怎样调用。

### 2. 重载签名与函数实现的关系

- 上面的重载签名面向函数调用者。
- 下面的实现签名负责统一接收所有可能的参数。
- 实现签名必须能够兼容前面列出的全部重载签名。

### 3. 调用者看不到实现签名

TypeScript 检查 `findUser(...)` 时，主要依据前面的重载签名。最后一条带函数体的实现签名负责容纳所有分支，但它本身不是额外开放给调用者的第四种调用方式。

| 层次 | 负责什么 | 本例中的内容 |
|---|---|---|
| 重载签名 | 描述允许怎样调用 | 数组、数字、无参数 |
| 实现签名 | 统一接住所有合法参数 | `params?: number \| number[]` |
| 函数体 | 在运行时判断并执行功能 | `Array.isArray`、`typeof`、`else` |

> [!TIP]
> 可以把重载签名理解成“对外菜单”，把实现签名和函数体理解成“后厨真正处理订单的地方”。

## 三、实现函数功能

### 1. 使用联合类型接收不同参数

```js
//实现函数
// 第一个变量 是 number | number[]
function findUser(params?:number | number[]):number[]{
    if(params && Array.isArray(params)){
        user.push(...params)
        return user
    }
    else if (params && typeof params === 'number'){
        return  user.filter(i=>i===params)
    }
    else{
        return user
    }
}
```

### 2. 三个判断分支

**传入数组：**

`Array.isArray(params)` 判断参数是不是数组。如果是，就使用 `user.push(...params)` 将数组中的数据添加到 `user`。

**传入数字：**

`typeof params === 'number'` 判断参数是不是数字。如果是，就使用 `filter` 查找与该数字相等的元素。

**没有传入参数：**

前两个条件都不满足时，直接返回完整的 `user` 数组。

> [!NOTE]
> `params?` 表示参数可以不传，它的完整类型可以理解为 `number | number[] | undefined`。

> [!WARNING] 原文观察：`0` 会被当成“没有参数”
> 当前判断先检查了 `params &&`。数字 `0` 是 JavaScript 中的假值，所以 `findUser(0)` 不会进入数字分支，而会执行最后的 `else` 并返回全部用户。这里体现的是运行时真假值规则，不是函数重载本身的问题。

**补充判断思路（不替换原代码）：**

```ts
if (Array.isArray(params)) {
  // 数组分支
} else if (typeof params === 'number') {
  // 数字分支，0 也能进入
} else {
  // undefined 分支
}
```

## 四、调用函数

```js
console.log(findUser())
console.log(findUser(1))
console.log(findUser([4,5]))
```

执行顺序如下：

1. `findUser()` 返回当前全部数据。
2. `findUser(1)` 返回数组中等于 `1` 的数据。
3. `findUser([4,5])` 把 `4`、`5` 添加到原数组，然后返回更新后的数组。

## 五、函数重载的书写顺序

```text
重载签名 1
重载签名 2
重载签名 3
统一的实现签名与函数体
```

> [!TIP]
> 记忆口诀：**先列调用方式，再写统一实现，最后在函数内部判断参数类型。**

## 六、函数重载和联合类型怎么选

当前示例的三种调用最终都返回 `number[]`，因此它很适合用来学习重载语法，但在普通业务代码中也可以只写一个联合类型签名。

| 场景 | 更合适的选择 |
|---|---|
| 不同参数最终返回同一种类型，内部处理也简单 | 联合类型通常更直接 |
| 参数不同，返回类型也跟着改变 | 函数重载更能表达对应关系 |
| 调用方式数量较少，使用类型收窄就能读懂 | 优先联合类型 |
| 需要给调用者精确的参数提示和返回值提示 | 考虑函数重载 |

**补充示例：参数决定返回值类型**

```ts
function format(value: number): string
function format(value: boolean): 'yes' | 'no'
function format(value: number | boolean): string {
  return typeof value === 'number' ? value.toFixed(2) : value ? 'yes' : 'no'
}
```

这里的重载有实际价值：传入 `number` 和传入 `boolean` 时，调用者得到的返回类型提示不同。

## 七、副作用与返回值引用

`user.push(...params)` 会直接修改外部的 `user` 数组，这叫作**副作用**。另外，查询全部和添加数据时返回的是同一个数组引用，调用者如果继续修改返回结果，也会影响原数组。

> [!NOTE]
> 这不代表原代码一定错误，而是阅读函数时要同时关注“返回了什么”和“修改了什么”。

## 复习练习

1. 预测 `findUser(0)` 在当前原代码中的输出，并说明原因。
2. 如果传入字符串应该按用户名查询，需要新增哪条重载签名？实现签名应如何扩大？
3. 尝试解释：为什么实现签名写了 `number | number[] | undefined`，调用者仍然不能随便传入其他类型？

## 参考资料

- [TypeScript Handbook：Function Overloads](https://www.typescriptlang.org/docs/handbook/2/functions.html#function-overloads)
- [TypeScript Handbook：Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)

## 一句话总结

> 函数重载用于描述“同一个函数可以怎样被调用”，联合类型和类型判断则用于完成函数内部的统一实现。
