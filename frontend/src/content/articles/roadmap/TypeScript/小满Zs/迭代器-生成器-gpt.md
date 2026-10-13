# 迭代器与生成器学习笔记

对应示例：[src/迭代器-生成器.ts](../src/迭代器-生成器.ts)

## 一、先记住结论

1. **迭代器（Iterator）**是一种“按需取下一个值”的对象，核心是 `next()` 方法。
2. **可迭代对象（Iterable）**是拥有 `[Symbol.iterator]()` 方法的对象；调用它会得到一个迭代器。
3. **生成器函数（`function*`）**是创建迭代器的快捷写法。调用生成器函数后得到的生成器对象，同时具备 `next()` 和 `[Symbol.iterator]()`。
4. `for...of`、数组展开 `[...]`、数组解构等语法，底层都会按照迭代协议读取数据。
5. 手写迭代器通常有机会更快；生成器通常更容易写、更容易维护。除非确实有性能瓶颈，否则优先使用生成器表达“暂停并继续产出”的逻辑。

## 二、迭代器和生成器的关系

可以用下面这条链路理解：

```text
可迭代对象 Iterable
        │ 调用 [Symbol.iterator]()
        ▼
迭代器 Iterator
        │ 反复调用 next()
        ▼
{ value: 当前值, done: 是否结束 }

生成器函数 function* ──调用──> 生成器对象 Generator
                                  ├─ next()
                                  └─ [Symbol.iterator]()
```

### 1. 迭代器协议

一个最小迭代器至少要提供：

```ts
interface IteratorResult<T> {
  value: T | undefined
  done: boolean
}

interface Iterator<T> {
  next(): IteratorResult<T>
}
```

- `done: false`：本次拿到了一个值，后面可能还有值。
- `done: true`：遍历结束。通常最后一次的 `value` 是 `undefined`。

### 2. 可迭代对象与迭代器不是一回事

- 数组、字符串、`Set`、`Map`、`NodeList` 等是常见的可迭代对象。
- 它们通过 `[Symbol.iterator]()` 返回迭代器。
- 生成器对象比较特殊：它既是迭代器，也是可迭代对象，并且自己的 `[Symbol.iterator]()` 通常返回自己。

因此，原文件中的这句话可以更准确地说成：

> 生成器对象实现了迭代器协议和可迭代协议，不必把它理解成传统面向对象里的“子类”。

## 三、生成器函数能否快速产出迭代器对象？

可以。`function*` 的 `*` 表示这是生成器函数：

```ts
function* gen() {
  yield 'Zora'
  yield 'Raechel'
  yield 'Ruby'
  yield 'Kiran'
}

const female = gen() // 此时得到生成器对象，不会一次性执行完函数体

female.next() // { value: 'Zora', done: false }
female.next() // { value: 'Raechel', done: false }
female.next() // { value: 'Ruby', done: false }
female.next() // { value: 'Kiran', done: false }
female.next() // { value: undefined, done: true }
```

`yield` 类似一个“暂停点”：调用一次 `next()`，执行到下一个 `yield`，把值交出去，然后暂停。再次调用 `next()`，再从上次暂停的位置继续。

### `yield Promise` 的注意点

原文件中的：

```ts
yield Promise.resolve('Zora')
```

只是在迭代器中产出一个 Promise。普通生成器不会自动等待 Promise，所以第一次 `next().value` 的类型是 `Promise<string>`。如果需要异步迭代，应考虑 `async function*` 和 `for await...of`。

## 四、原文件底部手写迭代器的执行过程

原代码给普通对象增加了 `[Symbol.iterator]()`：

1. `for...of` 先调用 `obj[Symbol.iterator]()`。
2. 该方法返回一个带 `next()` 的迭代器对象。
3. `for...of` 不断调用 `next()`。
4. `current` 从 `0` 递增到 `max - 1`，每次返回 `{ value: current, done: false }`。
5. 当 `current === max` 时返回 `{ value: undefined, done: true }`，循环结束。

关键代码的逐行注释如下：

```ts
const obj = {
  max: 5,
  current: 0,

  // 让 obj 成为可迭代对象。
  [Symbol.iterator]() {
    // 每次开始遍历都创建一个新的迭代器状态。
    return {
      max: this.max,
      current: this.current,

      // 迭代器的核心方法：每调用一次，返回一个 { value, done }。
      next() {
        // current 到达 max 后，明确告诉 for...of 已经结束。
        if (this.current === this.max) {
          return { value: undefined, done: true }
        }

        // 后置自增：先返回当前值，再把游标加 1。
        return { value: this.current++, done: false }
      }
    }
  }
}

for (const value of obj) {
  console.log(value) // 0、1、2、3、4
}
```

原文件中的两种展开也要区分：

```ts
const x1 = { ...obj } // 对象展开：复制 max、current 等自身可枚举属性
const x2 = [...obj]   // 数组展开：调用 obj[Symbol.iterator]()，得到 [0, 1, 2, 3, 4]
```

这里的 `x1`、`x2` 是“展开”，不是严格意义上的“解构”。

## 五、手写迭代器和生成器，哪个快？

### 结论

在逻辑相同、只比较大量 `next()` 调用的微基准中，**手写迭代器通常略快**，因为生成器需要维护暂停/恢复所需的内部状态机。生成器的优势是代码更短、状态管理更自然，并且不容易漏写 `done` 逻辑。

我在当前 Node.js 环境用 `1,000,000` 个值、重复 `8` 轮做了一个简单对比，结果大致是：

| 写法 | 8,000,000 次 `next()` 的耗时 |
| --- | ---: |
| 生成器 | 约 73～81 ms |
| 手写迭代器 | 约 39～42 ms |

这个结果只说明当前运行时、当前写法和当前数据规模下的差异，不能当成所有浏览器、所有业务代码的固定结论。真实业务里，网络请求、DOM 操作、对象分配等成本通常远高于这点差异。

### 选择建议

| 需求 | 推荐 |
| --- | --- |
| 业务代码、分页、树遍历、数据管道 | 生成器 |
| 需要极致控制状态或已经定位到迭代器是热点 | 手写迭代器，并配合真实场景压测 |
| 只是遍历数组/Set/Map | 直接使用 `for...of`，不必自己实现 |

## 六、使用场景

### 1. 惰性计算和大数据流

只在调用 `next()` 时生成一个值，不必一次性把全部结果放进内存：

```ts
function* range(start: number, end: number) {
  for (let i = start; i < end; i++) {
    yield i
  }
}

for (const value of range(0, 3)) {
  console.log(value)
}
```

### 2. 分页/分批读取

每次 `yield` 一页数据，调用方处理完当前页后再请求下一页，避免一次加载全部数据。

### 3. 树、图等递归遍历

生成器可以把“遍历顺序”写成接近自然业务流程的代码，例如深度优先遍历树节点。

### 4. 数据转换管道

把过滤、映射、截断等步骤串成多个可组合的迭代器，数据只流过一次。

### 5. 自定义 `for...of` 行为

给领域对象实现 `[Symbol.iterator]()`，让调用方能使用统一的 `for...of` 语法，例如时间范围、分页结果、业务集合等。

### 6. 异步数据流

对于逐步产生的异步数据，使用 `async function*`：

```ts
async function* readPages() {
  yield await fetch('/api/page/1')
  yield await fetch('/api/page/2')
}

for await (const page of readPages()) {
  console.log(page)
}
```

## 七、这份示例的复习要点

- 看到 `next()`，想到迭代器。
- 看到 `[Symbol.iterator]()`，想到可迭代对象。
- 看到 `function*` 和 `yield`，想到“用暂停点快速创建迭代器”。
- `for...of` 依赖迭代协议；普通对象默认不能直接使用。
- `yield Promise` 不等于 `await`；异步场景使用 `async function*`。
- 先选可读性和正确性，再用真实压测决定是否需要手写迭代器优化。
