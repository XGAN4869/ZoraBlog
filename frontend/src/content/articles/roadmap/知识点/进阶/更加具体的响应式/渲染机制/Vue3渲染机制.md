# Vue 3 渲染机制：先理解页面为什么会变化

> [!info] 本篇学习方式
> 这一版先讲“发生了什么”和“为什么这样做”，不以源码函数名为主线。你可以先把流程讲通，再回头看源码。
>
> 需要查源码调用链时，再阅读：[[Vue3渲染机制-源码版]]。

## 学习目标

读完后，能够回答四个问题：

1. Vue 第一次打开页面时，页面是怎么显示出来的？
2. 我修改一个 `ref` 或 `reactive` 数据后，Vue 怎么知道页面需要更新？
3. Vue 为什么不直接操作 DOM，而要先生成 VNode？
4. 模板、render 函数、VNode 和真实 DOM 到底是什么关系？

## 一、先建立整体模型

可以把 Vue 想成一个“自动重做页面”的系统：

```text
你写的数据 + 模板
        ↓
Vue 根据模板生成页面描述
        ↓
Vue 把页面描述变成真实 DOM
        ↓
你修改数据
        ↓
Vue 找到受影响的组件
        ↓
组件重新生成页面描述
        ↓
Vue 只把变化的部分同步到真实 DOM
```

这条主线里有四个关键词：

| 关键词 | 用简单的话理解 |
|---|---|
| 模板 | 你写的 `<div>{{ count }}</div>`，方便人阅读 |
| render 函数 | Vue 真正执行的“生成页面描述”的函数 |
| VNode | 页面描述对象，记录“这里应该有什么节点” |
| 真实 DOM | 浏览器页面中真正显示出来的节点 |

> [!tip] 最重要的一句话
> **数据决定页面，render 函数负责把数据变成 VNode，Vue 再把 VNode 变成真实 DOM。**

## 二、第一次打开页面：Vue 做了什么

假设有下面这个组件：

```vue
<template>
  <button>{{ count }}</button>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>
```

第一次打开页面时，可以按 5 步理解。

### 第 1 步：准备数据

Vue 执行组件的 `setup()`，得到 `count`。

此时 `count` 不只是普通数字，而是一个 Vue 可以观察的响应式数据。

```text
count = ref(0)
        ↓
Vue 记住：以后有人读取 count，先记下来
        ↓
Vue 也记住：以后 count 改变，要通知这些使用者
```

### 第 2 步：准备“生成页面”的函数

```markdown
template模板字符串
  ↓ parse
→ AST（普通JS对象树，编译阶段的数据结构)
  ↓ transform（优化、处理v‑if/v‑for、patchFlag、静态提升）
→ 转换后的AST
  ↓ generate(codegen) 遍历转换后的 AST, 生成 JavaScript 源码字符串
→ JavaScript源码字符串 [render函数字符串（纯文本字符串！不是可执行函数）

⭐情况1: new Function 浏览器运行时编译
  ↓ new Function() 后 
→ ✅ 真正的 render 函数

⭐情况2: .vue 文件构建时编译, 所以浏览器运行时主要执行已经生成的 render 函数
  ↓ Vue 插件和构建工具处理
  javascript 模块
  ↓ 浏览器加载并执行
  ✅ 真正的 render 函数
```

#### 补充重点👇
- 模板不会直接被浏览器执行。Vue 会把模板转换成一个 render 函数。
- 可以把它想象成下面这样：
```js
// 这是帮助理解的简化写法，不是模板编译后的完整代码
function render() {
  return {
    type: 'button',
    children: String(count.value)
  }
}
```

- 真实项目中，`.vue` 文件的模板通常在构建阶段就被转换好了，所以浏览器运行时主要执行已经生成的 render 函数。
- AST 是编译阶段的数据结构。
- VNode 是 render 执行后产生的运行时页面描述。
- 构建时编译通常不在浏览器中调用 `new Function()`。
- 运行时编译才会使用 `new Function()` 把代码字符串变成函数。

#### 示例
```vue
<p>{{ message }}</p>
```
👆 生成 👇
```js
function render(_ctx, _cache) { //_ctx：组件上下文，可以访问 message
  //render() 返回 VNode
  return (
    _openBlock(),
    _createElementBlock(
      'p',
      null,
      _toDisplayString(_ctx.message),
      1 // TEXT：这里的文本是动态的
    )
  )
}
```

>[!tip] 注意 
到这里仅仅是“得到了 render 函数”，还没有 VNode，也没有真实 DOM。

### 第 3 步：执行 render，得到 VNode

```
Vue3 运行阶段：
创建组件渲染副作用 ReactiveEffect，这是真正执行 render 函数 的地方
创建组件
  ↓
创建组件渲染 ReactiveEffect
  ↓
ReactiveEffect 执行 render
  ↓
render 返回 VNode
  ↓
patch 把 VNode 变成真实 DOM

→ effect.run()
→ 执行 render
→ 读取响应式数据并 track
→ 返回 VNode
→ patch 真实 DOM
```

1.准备好 render 函数 2. 执行 render 函数 3. 执行 render 函数时收集依赖
```js
2. 执行 render 函数：组件挂载时， Vue3 内部会调用 setupRenderEffect()
```

```js
// 1. 工人：纯粹渲染逻辑，普通函数，不知道什么是响应式
function componentUpdateFn() {
  if (!instance.isMounted) {
    // 首次挂载：执行render拿VNode，patch(null,subTree)
  } else {
    // 更新：重新render拿新VNode，patch(old,new)
  }
}

// 2. ReactiveEffect 包装这个普通函数
const effect = new ReactiveEffect(componentUpdateFn)
```

这个 VNode 可以理解为一张“页面施工图”：

```text
VNode
└─ type: button
   └─ children: "0"
```

VNode 不是浏览器的 DOM，它只是一个普通的 JavaScript 对象，用来描述页面应该长什么样。

### 第 4 步：把 VNode 变成真实 DOM

Vue 根据 VNode 创建真实节点：

```text
VNode：button，文本是 "0"
        ↓
document.createElement('button')
        ↓
button.textContent = '0'
        ↓
插入页面
```

这一步完成后，浏览器中才真正出现按钮。

### 第 5 步：记录这次 render 用过哪些数据

执行 render 时读取了 `count.value`，Vue 就会建立一条关系：

```text
当前组件的 render  ← 使用了 ←  count
```

这就是依赖收集。它的作用是：以后只要 `count` 改变，Vue 就知道应该重新执行这个组件的 render。

## 三、修改数据后：页面为什么会更新

```
数据变化：
Proxy/ref setter
→ trigger
→ queueJob
→ effect.run()
→ 重新执行 render
→ 新旧 VNode patch
→ 更新真实 DOM
```

当我们点击按钮，执行：

```js
count.value++
```

Vue 的更新过程可以按 6 步理解。

### 第 1 步：数据发生变化

`count` 从 `0` 变成 `1`。

### 第 2 步：Vue 查找依赖

Vue 之前已经知道：这个组件的 render 读取过 `count`。

所以它通知这个组件：

```text
count 变了
  ↓
使用过 count 的组件需要重新检查
```

### 第 3 步：把更新放入队列

Vue 通常不会在每一次赋值的瞬间立刻执行 render，而是先把组件更新任务放入队列。

这样做是为了合并连续修改：

```js
count.value++
count.value++
count.value++
```

Vue 没必要中间渲染三次，通常会等这一轮代码执行完，再统一更新。

### 第 4 步：重新执行 render

队列开始处理后，组件重新执行 render：

```text
旧数据：count = 0
新数据：count = 3
        ↓
重新执行 render()
        ↓
得到新的 VNode：button 的文本是 "3"
```

### 第 5 步：比较新旧 VNode

Vue 手里现在有两张施工图：

```text
旧 VNode：button，文本 "0"
新 VNode：button，文本 "3"
```

Vue 会比较它们：

- 节点类型都是 `button`，按钮本身可以复用。
- 只有文本从 `0` 变成了 `3`。
- 因此只更新按钮文本，不重新创建整个按钮。

这个比较和更新过程通常叫 **patch**；大家常说的 Diff，主要就是其中“比较新旧节点”的部分。

### 第 6 步：把差异应用到真实 DOM

```text
真实 DOM：button，文本 "0"
        ↓
只修改 textContent
        ↓
真实 DOM：button，文本 "3"
```

所以，Vue 更新页面的核心不是“重新生成全部 DOM”，而是：

```text
数据变化 → 重新生成 VNode → 找出差异 → 修改必要的 DOM
```

## 四、把首次渲染和更新放在一起看

| 阶段 | Vue 手里有什么 | Vue 主要做什么 |
|---|---|---|
| 第一次显示 | 没有旧 VNode，只有新 VNode | 根据新 VNode 创建 DOM |
| 数据更新 | 旧 VNode + 新 VNode | 比较两棵树，更新变化部分 |
| 数据没有影响当前组件 | 新旧结果相同或组件不需要更新 | 尽量跳过无意义工作 |
| 组件卸载 | 已经存在的 VNode 和 DOM | 执行清理并移除 DOM |

> [!note] 首次渲染也会经过 patch
> 只是第一次没有旧 VNode 可以比较，所以主要是“创建”；后续才是“比较并更新”。

## 五、模板、render、VNode、DOM 的关系

不要把这四个东西当成同一个概念：

```text
模板
  ↓ 编译
render 函数
  ↓ 执行
VNode
  ↓ patch
真实 DOM
```

### 模板是什么

模板是给开发者写的声明式结构：

```vue
<div>{{ message }}</div>
```

它表达的是：“页面上需要一个 `div`，里面显示 `message`”。

### render 函数是什么

render 函数是 Vue 执行的 JavaScript 函数。它根据当前数据返回 VNode。

模板只是更容易书写的形式，render 函数才是运行时真正执行的逻辑。

### VNode 是什么

VNode 是“页面应该长什么样”的对象，不是 DOM，也不会直接显示在浏览器中。

### 真实 DOM 是什么

真实 DOM 是浏览器维护的节点，只有它发生变化，用户看到的页面才会变化。

## 六、为什么需要 VNode

如果没有 VNode，数据变化后，Vue 需要直接操作大量 DOM。这样会带来两个问题：

1. 每个组件都要自己处理复杂的新增、删除、移动和属性更新。
2. 很难统一判断哪些 DOM 真的需要修改。

VNode 提供了一个中间层：

```text
数据
  ↓
VNode
  ↓
DOM
```

有了这个中间层，Vue 可以先在 JavaScript 中比较新旧页面描述，再集中处理 DOM 差异。

> [!warning] VNode 不是为了“让所有更新都更快”
> 创建 VNode 和比较 VNode 本身也有成本。Vue 3 通过编译优化、静态提升和动态节点提示，减少不必要的比较，而不是简单地认为“有 VNode 就一定更快”。

## 七、Vue 3 的更新为什么可以更聪明

### 1. 编译器提前知道哪些地方可能变化

例如：

```vue
<div class="box">
  <span>{{ count }}</span>
  <p>这段文字一直不变</p>
</div>
```

Vue 编译模板时可以看出：

- `class="box"` 是静态的。
- `{{ count }}` 是动态的。
- `<p>` 中的文字是静态的。

因此更新 `count` 时，Vue 重点检查动态文本，不需要把所有内容都当成可能变化。

### 2. 静态内容可以复用

不会变化的节点可以提前生成或标记，后续更新时重复使用。

### 3. 列表通过 key 判断节点身份

```vue
<li v-for="item in list" :key="item.id">
  {{ item.name }}
</li>
```

`key` 告诉 Vue：“这个节点对应哪个数据项”。当列表新增、删除或排序时，Vue 才能尽量复用正确的 DOM 节点。

> [!tip] `key` 的本质
> `key` 不是为了让列表“看起来更快”，而是为了帮助 Vue 判断节点身份。它应该稳定、唯一，并且最好来自数据本身的 id。

## 八、把响应式和渲染连接起来

可以把一个组件理解成一个函数：

```text
页面结果 = render(当前状态)
```

Vue 做的事情是把这个函数变成“会自动重做的函数”：

```text
第一次执行 render
  → 记录 render 读取了哪些响应式数据

某个响应式数据变化
  → 找到依赖它的 render
  → 安排 render 重新执行
  → 得到新 VNode
  → patch 到 DOM
```

这就是响应式系统和渲染系统的连接点：

- 响应式系统负责回答：**谁使用了这个数据？**
- 渲染系统负责回答：**重新计算后，页面哪里变了？**
- DOM 渲染器负责回答：**如何把这个变化写入浏览器？**

## 九、生命周期只记和渲染有关的部分

先不要背所有生命周期，把它们放进两条流程：

### 首次显示

```text
setup
  ↓
beforeMount
  ↓
首次 render
  ↓
首次 patch，创建 DOM
  ↓
mounted
```

### 数据更新

```text
数据变化
  ↓
beforeUpdate
  ↓
重新 render
  ↓
patch，更新 DOM
  ↓
updated
```

如果只是想在数据变化后读取已经更新的 DOM，可以使用：

```js
await nextTick()
```

因为数据赋值和 DOM 更新之间通常还隔着 Vue 的更新队列。

## 十、用一个问题检查自己是否理解

当你看到：

```js
const count = ref(0)

function add() {
  count.value++
}
```

应该能够自己说出：

1. `count` 是响应式数据。
2. 模板中的 `{{ count }}` 在第一次 render 时读取了它。
3. Vue 因此记录了“这个组件依赖 count”。
4. `count.value++` 触发这个组件进入更新队列。
5. 组件重新 render，得到新的 VNode。
6. Vue 比较新旧 VNode，发现只需要修改文本。
7. 浏览器中的按钮文本最终发生变化。

如果这 7 步能够顺着讲出来，就已经掌握了 Vue 3 渲染机制的主逻辑。

## 十一、常见误区

1. **模板直接变成 DOM。** 不准确。模板通常先变成 render 函数，再生成 VNode，最后才是 DOM。
2. **数据变化后 Vue 直接把整个页面重做。** 不准确。组件会重新计算 VNode，再尽量只更新变化的部分。
3. **VNode 就是真实 DOM。** 错。VNode 是 JavaScript 对象，真实 DOM 才会显示在页面上。
4. **Vue 3 没有 Diff。** 错。Vue 3 仍然需要比较新旧 VNode，只是编译器提供了更多优化信息。
5. **修改数据后 DOM 一定同步改变。** 不一定。Vue 通常会批量安排更新，需要等待 `nextTick()` 才能读取更新后的 DOM。
6. **`key` 只是为了消除警告。** 不准确。`key` 帮助 Vue 判断列表节点身份，影响节点复用和更新结果。

## 十二、最后再看一张简化流程图

```text
【第一次显示】
setup 准备状态
    ↓
render 读取状态并生成 VNode
    ↓
patch 创建真实 DOM
    ↓
页面显示

【之后更新】
状态发生变化
    ↓
Vue 找到依赖这个状态的组件
    ↓
组件重新 render，生成新 VNode
    ↓
比较旧 VNode 和新 VNode
    ↓
只修改需要变化的真实 DOM
```

## 十三、官方资料

- [Vue：渲染机制](https://vuejs.org/guide/extras/rendering-mechanism.html)
- [Vue：响应式基础](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Vue：生命周期钩子](https://vuejs.org/guide/essentials/lifecycle.html)
- [Vue：渲染函数与 JSX](https://vuejs.org/guide/extras/render-function.html)

## 一句话总结

Vue 3 的渲染逻辑可以记成：**第一次执行 render 生成页面，执行时记录它依赖的数据；数据变化后重新执行 render，比较新旧 VNode，再把差异更新到真实 DOM。**
