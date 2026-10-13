# Vue2 / Vue3：从模板编译到 render、响应式、VNode 与真实 DOM

这份笔记把前面讨论的内容合并成一条完整链路，并逐个解释每个角色。

---

## 一、先看完整地图

Vue 的流程由两条互相衔接的链组成：

```text
编译链
template
  ↓ parse
AST
  ↓ optimize（Vue2）/ transform（Vue3）
优化后的 AST
  ↓ generate
render 函数源码字符串
  ↓ new Function 或构建工具生成 JavaScript 模块
真正可执行的 render 函数

运行链
创建组件
  ↓
创建渲染 Watcher（Vue2）或 ReactiveEffect（Vue3）
  ↓
执行 render
  ↓
读取响应式数据并收集依赖
  ↓
得到 VNode 树
  ↓
patch
  ↓
创建或更新真实 DOM
```

最重要的边界：

- 编译阶段负责“制造 render”。
- 执行 render 后才得到 VNode。
- 执行 patch 后才操作真实 DOM。
- 依赖收集发生在 render 执行并读取响应式数据的过程中。

---

## 二、六个基础名词

### 1. template：给开发者写的模板

```vue
<p>{{ message }}</p>
```

它看起来像 HTML，但包含插值、`v-if`、`v-for` 等 Vue 语法。浏览器不认识这些 Vue 语法，所以需要先编译。

### 2. AST：编译阶段使用的对象树

模板会被表示成类似这样的结构：

```js
{
  type: 'element',
  tag: 'p',
  children: [
    {
      type: 'interpolation',
      content: 'message'
    }
  ]
}
```

AST 不是 DOM，也不是 VNode。它只是编译器理解和改写模板的数据结构。

### 3. render：根据当前状态生成 VNode 的函数

概念上可以理解为：

```js
function render() {
  return h('p', this.message)
}
```

它读取组件状态，调用 VNode 创建工具，最后返回 VNode。它不直接创建真实 DOM。

### 4. VNode：描述界面的 JavaScript 对象

```js
{
  type: 'p',
  children: '你好',
  shapeFlag: 1,
  patchFlag: 1
}
```

VNode 是对界面的描述，不是真实 DOM。Vue 可以先比较新旧 VNode，再决定怎样修改 DOM。

### 5. patch：创建或更新真实 DOM

```js
patch(null, newVNode)        // 首次挂载
patch(oldVNode, newVNode)    // 后续更新
```

### 6. 响应式依赖：记录谁使用了谁

```text
state.message
  └── 当前组件的 ReactiveEffect
```

含义是：当前组件的 render 使用过 `message`，所以 `message` 变化时要通知这个组件更新。

---

## 三、template 如何变成 render

### 3.1 Vue2 编译链

```text
template
  ↓ parse
AST
  ↓ optimize
标记静态节点
  ↓ generate
render 源码字符串
```

#### parse

解析标签、属性、文本、插值和指令，并建立 AST。

#### optimize

识别不会变化的静态节点，例如：

```html
<p>固定标题</p>
```

Vue2 会标记静态节点，减少后续更新中的重复比较。

#### generate

根据 AST 生成类似这样的代码：

```js
with (this) {
  return _c('p', [_v(_s(message))])
}
```

它最初通常仍是源码字符串，不是 VNode，也不是 DOM。

### 3.2 Vue3 编译链

```text
template
  ↓ parse
AST
  ↓ transform
转换后的 AST / JavaScript AST
  ↓ generate
render 函数源码
```

Vue3 的 transform 会处理：

- `v-if`、`v-for` 等结构转换；
- 插值、事件和属性表达式；
- 静态提升；
- patchFlag；
- Block Tree 的动态节点信息。

模板：

```vue
<p>{{ message }}</p>
```

大致编译为：

```js
function render(_ctx, _cache) {
  return (
    _openBlock(),
    _createElementBlock(
      'p',
      null,
      _toDisplayString(_ctx.message),
      1 // TEXT：文本是动态部分
    )
  )
}
```

`1` 是优化提示，不是 DOM，也不是响应式依赖。

---

## 四、render 字符串、render 函数、VNode、DOM 的区别

```text
render 源码字符串
  ↓ new Function / JavaScript 模块加载执行
真正可执行的 render 函数
  ↓ 调用 render()
VNode
  ↓ patch()
真实 DOM
```

### 情况一：浏览器运行时编译

完整构建版本包含模板编译器时，可以在浏览器把模板编译为源码，再通过 `new Function` 得到可执行函数。

`new Function` 只负责“字符串变函数”；调用 render 才得到 VNode。

### 情况二：`.vue` 构建时编译

Vite 的 `@vitejs/plugin-vue` 或 Webpack 的 `vue-loader` 会在构建阶段把模板编译成 JavaScript 模块。浏览器加载的是已经包含 render 的模块，不必再编译模板。

生产项目采用构建时编译可以减少浏览器端编译器体积和启动工作。

---

## 五、Vue3 中每个内部角色分别做什么

### 5.1 `instance`：组件内部实例

Vue 为每个组件创建内部实例，里面会保存：

- `render`：组件渲染函数；
- `proxy`：模板访问状态时使用的代理；
- `subTree`：上一次 render 得到的组件根 VNode；
- `effect`：组件渲染 ReactiveEffect；
- `update`：触发 effect 执行的函数；
- `isMounted`：是否已经完成首次挂载。

### 5.2 `instance.proxy`：render 访问组件数据的入口

编译结果中的 `_ctx.message`，概念上通过组件代理查找：

- `setupState` 中的状态；
- `data`；
- `props`；
- `ctx` 和公共属性。

所以 `_ctx` 不是随意的普通对象，**而是 Vue 准备的组件渲染上下文**

### 5.3 `render`：真正生成 VNode

`render` 负责：

```text
读取当前组件状态
  ↓
调用 VNode 创建辅助函数
  ↓
返回 VNode
```

它不负责决定何时执行，也不负责调用 patch。

### 5.4 `renderComponentRoot`：调用 render 的包装器

可以简化成：

```js
function renderComponentRoot(instance) {
  const { render, proxy } = instance
  // ✅关键点：调用编译生成的render函数 this指向 proxy；第一个参数就是 _ctx = proxy
  // 真正执行组件 render
  const result = render.call(
    proxy,
    proxy,
    instance.renderCache
  )

	// 做标准化：把返回值统一处理成合法VNode（数组、文本、Fragment都兼容）
	const subTree = normalizeVNode(rawVNode)
	return subTree
}
```
P.S. _ctx 在 instance.proxy 内_

所以准确关系是：

```text
renderComponentRoot ≠ render
renderComponentRoot 内部会调用 render
```

真实源码还处理：

- `setup()` 返回的渲染函数；
- 函数组件；
- `props`、`attrs`、`slots`、`emit`；
- Fragment 根节点；
- `inheritAttrs` 属性透传；
- 作用域 ID；
- render 执行错误；
- 最终根节点标准化。

可以把它理解成“组件根渲染总入口”，而 `render` 是里面真正负责生成 VNode 的核心函数。

### 5.5 `componentUpdateFn`：组织一次组件渲染

简化代码：

```js
function componentUpdateFn() {
  if (!instance.isMounted) {
    // 首次渲染，render 函数在 renderComponentRoot 中
    const subTree = renderComponentRoot(instance)
    instance.subTree = subTree

    // 没有旧 VNode，创建 DOM
    patch(null, subTree)

    instance.isMounted = true
  } else {
    // 后续更新
    const prevTree = instance.subTree
    const nextTree = renderComponentRoot(instance)
    instance.subTree = nextTree

    // 比较新旧 VNode
    patch(prevTree, nextTree)
  }
}
```

它负责判断：

- 首次执行：`patch(null, subTree)`；
- 后续执行：`patch(prevTree, nextTree)`。

### 5.6 `ReactiveEffect`：提供响应式执行环境

```js
const effect = new ReactiveEffect(componentUpdateFn)

const update = (
  instance.update = effect.run.bind(effect)
)

// 首次挂载时主动执行
update()
```

`ReactiveEffect` 不直接生成 VNode。它负责：

1. 执行 `componentUpdateFn`；
2. 执行期间标记“当前活动 effect”；
3. 让响应式 getter 能收集当前 effect；
4. 数据变化时被 `trigger` 找到；
5. 通过调度器安排下一次组件更新。

### 5.7 `setupRenderEffect`：把上面这些角色组装起来

这个函数负责为组件建立渲染 effect，大致做：

```text
准备 componentUpdateFn
  ↓
new ReactiveEffect(componentUpdateFn)
  ↓
把 effect 保存到 instance.effect
  ↓
把 effect.run 绑定为 instance.update
  ↓
配置 scheduler
  ↓
首次执行 instance.update()
```

---

## 六、⭐Vue3 的真实调用关系

```markdown
**「组装阶段」**
setupRenderEffect(instance) 【外层组装函数，只做准备工作】
│
├─ 1. 在内部定义 function 🌙componentUpdateFn() { ... } 【渲染业务逻辑函数】
│
├─ 2. new ⭐ReactiveEffect(componentUpdateFn, scheduler) 【包装，获得响应式能力】
│
├─ 3. 🌏instance.update = effect.run.bind(effect) 【把 run 挂到实例】
│
**「执行阶段」**
└─ 4. 🌏instance.update() 【✅这里才开始触发你上面完整的整条执行链】
         ↓
  实际是 effect.run()
⭐ReactiveEffect.run() 让工人具备"被追踪、被重新调度"能力的响应式包装器
	│ 开启当前响应式执行环境
	│ 设置 activeEffect
↓ 设置当前活动 effect
🌙componentUpdateFn() 【真正的组件render patch 逻辑】
	├────首次:render  VNode  patch(null, VNode) -- 直接把 VNode 转成 DOM
	├────更新:render新 VNodepatch(旧VNode,新 VNode)
↓
renderComponentRoot(instance) 【调用 instance.render 的包装工具】
	|	 instance.render.call(instance.proxy, ...)
	|    ⭐render 执行期间，依赖 ReactiveEffect 的 activeEffect 环境，调用者是 
	        renderComponentRoot
	|	 真正执行 render，拿到组件产出的 VNode 树（subTree），返回给上层 `componentUpdateFn`
↓
componentUpdateFn 调用 patch() 【直接把 VNode 转成/更新成 真实DOM】
	|	 diff 比较新旧 VNode
```



| 角色 | 职责 |
| --- | --- |
| `ReactiveEffect` | 决定怎样响应式地重新执行 |
| `componentUpdateFn` | 组织一次首次渲染或更新 |
| `renderComponentRoot` | 调用组件 render，并整理根 VNode |
| `render` | 根据当前状态生成 VNode |
| `patch` | 根据 VNode 创建或更新真实 DOM |

---

## 七、Vue3 首次挂载的完整时间线

```text
mountComponent
  ↓
创建组件 instance
  ↓
setupComponent
  ↓
处理 props、slots、setup 和 render
  ↓
setupRenderEffect
  ↓
创建 ReactiveEffect(componentUpdateFn)
  ↓
instance.update()
  ↓
effect.run()
  ↓
componentUpdateFn 发现 isMounted 为 false
  ↓
renderComponentRoot(instance)
  ↓
instance.render(...)
  ↓
render 读取 message
  ↓
Proxy/ref getter → track()
  ↓
render 返回 subTree VNode
  ↓
patch(null, subTree)
  ↓
递归创建真实 DOM
  ↓
插入挂载容器
  ↓
instance.isMounted = true
  ↓
执行 mounted 相关生命周期
```

首次挂载没有旧 VNode，所以主要是创建 DOM，而不是进行新旧 VNode Diff。

---

## 八、依赖收集到底在哪里发生

假设：

```js
const state = reactive({
  message: '你好'
})
```

render 中读取：

```js
_ctx.message
```

执行顺序：

```text
【执行阶段】

instance.update()
  ↓
effect.run()
  │
  ├─ 设置 activeEffect = 当前 ReactiveEffect
  ├─ 开启依赖追踪
  └─ 执行 componentUpdateFn()
       │
       ├─ 首次挂载分支
       │    ├─ renderComponentRoot(instance)
       │    │    └─ 调用 instance.render(...)
       │    │         └─ render 读取响应式数据并 track
       │    │              └─ 返回 VNode
       │    ├─ 保存 instance.subTree
       │    └─ patch(null, subTree)
       │
       └─ 更新分支
            ├─ 保存旧 VNode
            ├─ renderComponentRoot(instance)
            │    └─ 调用 instance.render(...)
            │         └─ 返回新 VNode
            ├─ 保存新 VNode
            └─ patch(oldTree, newTree)
                 └─ Diff 并更新真实 DOM
```

关键结论：

- 创建 effect 不等于已经收集依赖。
- effect 必须真正运行。
- render 必须真正读取某个响应式值。
- getter 执行 `track()` 后，依赖关系才建立。
- `renderComponentRoot` 不会扫描模板寻找依赖；依赖来自 render 运行时实际读取的数据。

---

## 九、`track`、`trigger` 和调度器

### 9.1 `track`：收集依赖

读取响应式数据时执行：

```text
track(target, key)
```

它把当前活动 effect 记录到该属性的依赖集合中。

### 9.2 `trigger`：找到需要通知的 effect

修改数据时：

```js
state.message = '晚上好'
```

Proxy setter 会触发：

```text
trigger(state, 'message')
```

它找到之前通过 `track` 记录的 effect。

### 9.3 scheduler：把更新任务放进队列

Vue通常不会直接同步执行完整组件更新，而是：

```text
trigger
  ↓
effect.scheduler
  ↓
queueJob
  ↓
组件更新任务进入队列
  ↓
微任务阶段批量刷新
```

因此连续修改多个状态时，Vue可以合并同一组件的重复更新任务。

### 9.4 `nextTick` 为什么存在

数据已经修改，不代表 DOM 同步更新完成。`nextTick` 用于等待当前更新队列刷新：

```js
state.message = '新内容'

await nextTick()

// 此时再读取更新后的 DOM
```

---

## 十、Vue3 数据更新完整时间线

```text
state.message = '晚上好'
  ↓
Proxy setter
  ↓
trigger(state, 'message')
  ↓
找到依赖 message 的 ReactiveEffect
  ↓
scheduler → queueJob
  ↓
微任务阶段刷新任务队列
  ↓
effect.run()
  ↓
componentUpdateFn 发现 isMounted 为 true
  ↓
保存 prevTree
  ↓
renderComponentRoot(instance)
  ↓
再次调用 instance.render(...)
  ↓
读取最新状态并生成 nextTree
  ↓
patch(prevTree, nextTree)
  ↓
更新必要的真实 DOM
  ↓
执行 updated 相关生命周期
```

---

## 十一、patch、Diff、patchFlag、静态提升和 Block Tree

### 11.1 首次 patch

```js
patch(null, subTree)
```

主要工作：

```text
判断 VNode 类型
  ↓
创建元素
  ↓
设置属性和事件
  ↓
递归处理子节点
  ↓
插入父容器
```

### 11.2 更新 patch 与 Diff

```js
patch(prevTree, nextTree)
```

会判断：

- 类型和 key 是否相同；
- 文本是否改变；
- props 和事件是否改变；
- 子节点结构是否改变；
- 列表中新旧 key 如何对应。

Diff 是 patch 更新过程中比较新旧 VNode 的逻辑，不是一个独立产生 DOM 的步骤。

### 11.3 patchFlag

例如：

```js
1 // TEXT
```

它告诉 patch：该节点的动态部分主要是文本，可以优先比较文本。

注意：

- patchFlag 通常不会阻止 render 执行；
- 它主要减少 patch 阶段的无意义检查；
- 不同标记可表示动态 class、style、props、文本等。

### 11.4 静态提升

编译器把稳定内容提到 render 外部：

```js
const _hoisted = createElementVNode('p', null, '固定内容')

function render() {
  return _hoisted
}
```

这样重复执行 render 时，可以直接复用稳定 VNode。

### 11.5 Block Tree

Vue3 会记录一个区块里的动态子节点，使更新时更快到达真正可能变化的节点，而不必盲目遍历所有静态层级。

---

## 十二、⭐一个完整 Vue3 示例

组件：

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

function add() {
  count.value++
}
</script>

<template>
  <button @click="add">{{ count }}</button>
</template>
```

### 构建阶段

```text
template
  ↓ parse
AST
  ↓ transform
识别事件和动态文本
  ↓ generate
render 函数源码
  ↓ 构建为 JavaScript 模块
真正的 render 函数
```

### 首次渲染

```text
setup 得到 count 和 add
  ↓
创建组件 ReactiveEffect
  ↓
effect.run()
  ↓
componentUpdateFn
  ↓
renderComponentRoot
  ↓
执行 render
  ↓
读取 count.value
  ↓
ref getter → track()
  ↓
得到 button VNode
  ↓
patch(null, buttonVNode)
  ↓
创建 button DOM
```

### 点击更新

```text
点击 button
  ↓
执行 add()
  ↓
count.value++
  ↓
ref setter → trigger()
  ↓
找到组件 ReactiveEffect
  ↓
queueJob
  ↓
effect.run()
  ↓
重新执行 render
  ↓
读取新的 count.value
  ↓
得到新 button VNode
  ↓
patch 旧 VNode 与新 VNode
  ↓
根据 TEXT patchFlag 更新按钮文本
```

---

## 十三、Vue2 的对应流程

Vue2 的核心链路：

```text
创建渲染 Watcher
  ↓
Watcher 执行 updateComponent
  ↓
vm._render()
  ↓
执行 render，触发 getter 和 Dep.depend()
  ↓
得到 VNode
  ↓
vm._update(vnode)
  ↓
__patch__
  ↓
创建或更新真实 DOM
```

数据变化：

```text
setter
  ↓
Dep.notify()
  ↓
渲染 Watcher 进入更新队列
  ↓
Watcher 重新执行 updateComponent
  ↓
重新执行 render
  ↓
新旧 VNode patch
```

### Vue2 与 Vue3 对照

| Vue2 | Vue3 | 含义 |
| --- | --- | --- |
| 渲染 Watcher | 渲染 `ReactiveEffect` | 驱动组件更新 |
| `updateComponent` | `componentUpdateFn` | 组织一次渲染 |
| `vm._render()` | `renderComponentRoot(instance)` 内部调用 `instance.render()` | 得到 VNode |
| `vm._update(vnode)` | `patch(prevTree, nextTree)` | 更新真实 DOM |
| `Object.defineProperty` | `Proxy` / `ref` | 拦截访问和修改 |
| `Dep.depend()` | `track()` | 收集依赖 |
| `Dep.notify()` | `trigger()` | 通知依赖 |
| Watcher 队列 | `queueJob` 调度队列 | 批量更新 |
| 静态节点标记 | patchFlag、静态提升、Block Tree | 编译优化 |

Vue2：

```text
Watcher
  → updateComponent
    → vm._render()
    → vm._update(vnode)
```

Vue3：

```text
ReactiveEffect
  → componentUpdateFn
    → renderComponentRoot(instance)
      → instance.render()
    → patch()
```

---

## 十四、当前 Vue2 页面内容应该怎样理解

### created

- data 已被处理成响应式；
- methods 等已经可用；
- 组件还没有完成真实 DOM 挂载；
- `$el` 此时不可作为已挂载 DOM 使用。

### 首次渲染

```text
渲染 Watcher 首次运行
  ↓
执行 render
  ↓
读取数据并收集依赖
  ↓
生成 VNode
  ↓
首次 patch
  ↓
创建真实 DOM
```

### mounted

- 首次真实 DOM 已经插入页面；
- 可以访问挂载后的 DOM；
- 首次渲染完成。

### 数据变化

```text
setter
  ↓
Dep 通知渲染 Watcher
  ↓
beforeUpdate
  ↓
重新执行 render
  ↓
新旧 VNode Diff + patch
  ↓
updated
```

### 销毁

`beforeDestroy / destroyed` 阶段会解绑和清理 Watcher、事件、子组件等资源。Vue3 对应名称是 `beforeUnmount / unmounted`。

---

## 十五、最容易混淆的十个问题

### 1. AST 是 VNode 吗？

不是。

- AST：编译阶段表示模板。
- VNode：运行阶段表示界面。

### 2. generate 后直接得到 VNode 吗？

不是。generate 先产生 render 源码；执行 render 后才得到 VNode。

### 3. `new Function` 后直接有 DOM 吗？

没有。它只得到可执行 render；还要执行 render 得到 VNode，再 patch 得到 DOM。

### 4. 创建 ReactiveEffect 就完成依赖收集了吗？

没有。effect 必须运行，render 必须读取响应式数据，getter 才能通过 `track` 收集依赖。

### 5. `renderComponentRoot` 是 render 吗？

不是。它是包装器，内部调用真正的 `instance.render`，并整理根 VNode。

### 6. `componentUpdateFn` 是 render 吗？

不是。它组织一次渲染：调用 `renderComponentRoot` 得到 VNode，然后调用 `patch`。

### 7. `ReactiveEffect` 会生成 VNode 吗？

不会直接生成。它执行 `componentUpdateFn`，后者沿调用链执行 render 并得到 VNode。

### 8. 首次挂载会做新旧 VNode Diff 吗？

没有旧 VNode，因此主要是 `patch(null, vnode)` 创建 DOM。

### 9. patchFlag 会让 render 不执行吗？

通常不会。render 仍需产生新 VNode；patchFlag 主要让 patch 更精准。

### 10. 数据改变后 DOM 为什么不是立刻同步更新？

因为更新通常通过 `queueJob` 进入异步批量调度队列。需要等待队列刷新，必要时使用 `nextTick`。

---

## 十六、面试回答模板

Vue 的渲染分为编译和运行两个阶段。编译阶段把 template 经过 parse 转换为 AST。Vue2 通过 optimize 标记静态节点，Vue3 通过 transform 处理指令并生成 patchFlag、静态提升和 Block Tree 等优化信息，最后 generate 产生 render 源码。源码经过运行时编译或构建工具处理后成为真正的 render 函数。

运行阶段中，Vue2 使用渲染 Watcher，Vue3 使用组件渲染 ReactiveEffect 驱动组件渲染。Vue3 的 effect 执行 componentUpdateFn，componentUpdateFn 调用 renderComponentRoot，renderComponentRoot 内部再执行组件真正的 render。render 读取 reactive 或 ref 数据时触发 track 收集依赖，并返回 VNode。首次渲染调用 patch(null, vnode) 创建真实 DOM；数据变化时由 trigger 找到对应 effect，通过调度队列重新执行 render，获得新 VNode，再通过 patch(oldVNode, newVNode) 对比并更新必要的真实 DOM。

---

## 十七、最终记忆口诀

```text
编译阶段造 render；
ReactiveEffect 决定何时执行；
componentUpdateFn 组织一次渲染；
renderComponentRoot 调用并整理 render；
render 根据状态生成 VNode；
track 记录依赖；
trigger 通知更新；
queueJob 批量调度；
patch 创建或更新真实 DOM。
```

