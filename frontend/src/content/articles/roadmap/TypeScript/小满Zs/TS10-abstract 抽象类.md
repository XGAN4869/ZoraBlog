# TS10：`abstract` 抽象类

## 一、抽象类是什么

抽象类是用来**描述一组子类共同结构**的基类。它可以包含已经实现的属性、构造函数和普通方法，也可以声明必须由子类实现的抽象方法。

> [!IMPORTANT]
> 抽象类不能直接 `new`。它只负责提供约束和公共逻辑，真正创建实例时要使用继承它的具体子类。

### 1. `abstract` 的两种常见用法

| 写法 | 含义 |
|---|---|
| `abstract class Vue` | 声明抽象类，不能直接实例化 |
| `abstract init(): void` | 声明抽象方法，只写方法签名，不写方法体 |

抽象方法后面的类型仍然是**类型标注**，例如 `name: string`、`init(name: string): void`。`abstract` 方法不能写实现代码。

## 二、抽象类示例

```ts
abstract class Vue {
  name: string | undefined

  constructor(name?: string) {
    this.name = name
  }

  // 普通方法：抽象类已经提供了实现，子类可以直接复用
  getName(): string | undefined {
    console.log('当前实例的构造函数：', this.constructor.name)
    console.log(this.name)
    return this.name
  }

  // 抽象方法：只有方法签名，没有方法体，要求子类实现
  abstract init(name: string): void
}
```

### 1. 派生类必须实现抽象方法

```ts
class React extends Vue {
  constructor() {
    // 调用父类构造函数；这里不会把 this 变成父类对象
    super()
  }

  // 实现父类的抽象方法
  init(name: string): void {
    this.setName(name)
  }

  setName(name: string): void {
    this.name = name
  }
}

const react = new React()
react.init('Zora')
react.getName()
```

如果 `React` 不实现 `init`，TypeScript 会报错：具体子类仍然是抽象的，不能被实例化。

### 2. `super()` 与 `this`

- `extends` 建立父子类继承关系，子类可以使用父类的公开成员。
- 派生类构造函数中，使用 `this` 之前必须先调用 `super()`。
- `super()` 执行父类构造函数的初始化逻辑；实例仍然是 `React`，所以 `this.constructor.name` 会得到 `React`。

## 三、抽象类和接口的区别

| 对比项 | 抽象类 | `interface` |
|---|---|---|
| 是否能包含实现 | 可以包含属性、构造函数和普通方法 | 只描述结构，不能提供运行时实现 |
| 是否能直接 `new` | 不能 | 接口本身不会生成运行时对象 |
| 继承/实现语法 | 子类使用 `extends` | 类使用 `implements`，接口之间也可 `extends` |
| 主要用途 | 复用公共代码，并强制子类完成某些方法 | 约束对象或类的形状 |

> 可以把抽象类理解为“带公共代码的半成品父类”，把接口理解为“只存在于编译期的结构契约”。

## 四、复习要点

1. 抽象类不能被实例化，只能被继承。
2. 抽象类可以同时拥有普通成员和抽象成员。
3. 抽象方法没有方法体，具体子类必须实现它。
4. `super()` 调用父类构造逻辑，不会改变实例的真实类型。
5. `abstract`、类型标注等 TypeScript 类型信息会在编译成 JavaScript 时被擦除；类的方法实现仍会保留。

## 五、练习题

1. 为什么 `new Vue()` 会报错？
2. 如果 `React` 删除 `init`，会发生什么？
3. `super()` 和 `this` 的执行顺序为什么有要求？
4. 如果只需要约束结构、不需要复用实现，应该优先考虑抽象类还是接口？
