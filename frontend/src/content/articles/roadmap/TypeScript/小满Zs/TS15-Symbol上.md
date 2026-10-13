# TS15：Symbol（上）

## 一、Symbol 是什么

Symbol 是 JavaScript 的原始类型，用来创建**唯一且不可变的标识值**。即使描述文字相同，每次调用 Symbol() 也会得到不同的值：

~~~ts
const a1 = Symbol(1)
const a2 = Symbol(1)

console.log(a1 === a2) // false
~~~

参数只是调试时使用的描述（description），不会决定 Symbol 的身份。

## 二、使用 Symbol 作为对象属性键

Symbol 很适合给对象添加不会和普通字符串属性冲突的“私有风格”键：

~~~ts
const obj = {
  name: 'Zora',
  [a1]: 111,
  [a2]: 222,
}

console.log(obj[a1]) // 111
console.log(obj[a2]) // 222
~~~

a1 和 a2 是两个完全独立的 Symbol，所以可以同时存在，不会互相覆盖。

### Symbol 属性不会被普通键枚举方法发现

~~~ts
Object.keys(obj)                  // 只返回可枚举的字符串键
Object.getOwnPropertyNames(obj)   // 只返回字符串键
Object.getOwnPropertySymbols(obj) // 只返回 Symbol 键
Reflect.ownKeys(obj)              // 返回字符串键和 Symbol 键
~~~

因此，Symbol 属性不是“读不到”，而是需要使用专门的 API 读取：

~~~ts
console.log(Object.getOwnPropertySymbols(obj)) // [a1, a2]
console.log(Reflect.ownKeys(obj))              // ['name', a1, a2]
~~~

## 三、Symbol.for 全局注册表

Symbol.for(key) 会先查找全局 Symbol 注册表：

- 如果 key 已经注册过，返回之前的 Symbol；
- 如果没有注册过，创建一个新的 Symbol 并登记。

~~~ts
const first = Symbol.for('xiaoman')
const second = Symbol.for('xiaoman')

console.log(first === second) // true
console.log(Symbol.keyFor(first)) // xiaoman
~~~

这和普通的 Symbol('xiaoman') 不同，后者每次都会创建新值。

## 四、内置 Symbol 与可迭代协议预告

JavaScript 使用一些内置 Symbol 扩展对象行为，例如：

- Symbol.iterator：定义对象如何被 for...of 遍历；
- Symbol.toStringTag：自定义 Object.prototype.toString 的标签；
- Symbol.toPrimitive：定义对象转成原始值时的规则。

本系列下一篇会重点使用 Symbol.iterator 实现迭代器和生成器相关逻辑。

## 五、复习要点

1. Symbol() 每次创建的值都唯一，描述文字不影响唯一性。
2. Symbol 属性适合避免对象键名冲突。
3. Object.keys 和 Object.getOwnPropertyNames 不会返回 Symbol 键。
4. Object.getOwnPropertySymbols 只读取 Symbol 键，Reflect.ownKeys 可以读取全部自有键。
5. Symbol.for 使用全局注册表，同一个 key 会得到同一个 Symbol。
