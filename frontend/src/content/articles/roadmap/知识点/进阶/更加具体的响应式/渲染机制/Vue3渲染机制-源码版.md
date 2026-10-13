# Vue 3 渲染机制：源码调用链版

> [!info] 本篇范围
> 本文保留源码导向的版本，依据本地 Vue `v3.5.40`（提交 `fa2885d8c`）整理。它适合在已经理解“数据 → render → VNode → DOM”主线后，用来定位源码，不建议作为第一遍入门材料。
>
> 建议先阅读逻辑版：[[Vue3渲染机制]]。

## 一、源码视角下的总流程

```text
SFC / template
    ↓ 编译器
render 函数
    ↓ 执行 render
VNode / Block
    ↓ 组件 ReactiveEffect
patch(prevVNode, nextVNode)
    ↓ runtime-core 调用 host 操作
真实 DOM

响应式状态变化
    ↓
ReactiveEffect.trigger()
    ↓
effect.scheduler() → queueJob()
    ↓
Promise 微任务 → flushJobs()
    ↓
组件重新 render → patch → 更新完成回调
```

## 二、运行时的三层结构

| 层次 | 职责 | 源码目录 |
|---|---|---|
| compiler | 模板解析、转换、代码生成 | `packages/compiler-core/src/` |
| runtime-core | VNode、组件、渲染 effect、patch、调度器 | `packages/runtime-core/src/` |
| runtime-dom | 浏览器 DOM 的 host 操作和属性更新 | `packages/runtime-dom/src/` |

runtime-core 不直接写死 `document.createElement`，而是接收 `runtime-dom` 提供的 `nodeOps` 和 `patchProp`。这使 Vue 3 可以支持自定义 renderer。

## 三、`createApp()` 到根组件渲染

### 1. runtime-dom 创建 renderer

源码位置：`C:\Project\vue源码\core\packages\runtime-dom\src\index.ts:72-85`

```ts
const rendererOptions = extend({ patchProp }, nodeOps)

function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions))
}
```

`createApp()` 最终使用 `runtime-core` 创建的 renderer。

### 2. app.mount 创建根 VNode

源码位置：`C:\Project\vue源码\core\packages\runtime-core\src\apiCreateApp.ts:253-390`

可以把挂载主线理解为：

```ts
const vnode = createVNode(rootComponent, rootProps)
vnode.appContext = context
render(vnode, container)
```

### 3. render 进入 patch

源码位置：`C:\Project\vue源码\core\packages\runtime-core\src\renderer.ts:2418-2444`

```ts
if (vnode == null) {
  if (container._vnode) unmount(container._vnode)
} else {
  patch(container._vnode || null, vnode, container)
}
container._vnode = vnode
```

首次挂载时旧 VNode 是 `null`；后续根更新时，旧 VNode 来自 `container._vnode`。

## 四、组件挂载调用链

```text
patch(null, componentVNode)
  ↓
processComponent()
  ↓
mountComponent()
  ↓
createComponentInstance()
  ↓
setupComponent()
  ├─ initProps()
  ├─ initSlots()
  └─ setupStatefulComponent()
       ├─ 创建 render proxy
       ├─ 调用 setup()
       └─ finishComponentSetup()
  ↓
setupRenderEffect()
```

源码位置：

- `C:\Project\vue源码\core\packages\runtime-core\src\renderer.ts:1165-1273`
- `C:\Project\vue源码\core\packages\runtime-core\src\component.ts:809-965`

### render 函数的来源

| 来源 | 处理方式 |
|---|---|
| `setup()` 返回函数 | 直接作为组件 render |
| 构建工具生成的 `Component.render` | 直接使用 |
| runtime + compiler 构建中的 `template` | 运行时调用 `compile()` 生成 render |

源码位置：`C:\Project\vue源码\core\packages\runtime-core\src\component.ts:1000-1094`

## 五、模板编译：Parse → Transform → Codegen

`compiler-core/src/compile.ts` 的 `baseCompile()` 主线：

```ts
const ast = isString(source) ? baseParse(source, options) : source
transform(ast, resolvedOptions)
return generate(ast, resolvedOptions)
```

### Parse

`baseParse()` 把模板字符串解析为 AST，识别元素、属性、指令、插值、文本和注释。

### Transform

`transform()` 遍历 AST，执行节点和指令转换，并准备代码生成信息。静态节点、动态节点、block 等优化信息在这一阶段逐步形成。

### Codegen

`generate()` 根据 AST 生成 render 代码和 helper 引用。编译后的 render 函数执行后才会真正生成 VNode。

源码位置：

- `C:\Project\vue源码\core\packages\compiler-core\src\compile.ts:67-125`
- `C:\Project\vue源码\core\packages\compiler-core\src\parser.ts:1028`
- `C:\Project\vue源码\core\packages\compiler-core\src\transform.ts:334-410`
- `C:\Project\vue源码\core\packages\compiler-core\src\codegen.ts:283-390`

## 六、VNode、Block 和 patch flag

### 1. createVNode

源码位置：`C:\Project\vue源码\core\packages\runtime-core\src\vnode.ts:531-632`

VNode 是描述节点的对象，常见信息包括：

- `type`：元素、组件、Fragment 等类型。
- `props`：属性、事件和组件 props。
- `children`：子节点或文本。
- `shapeFlag`：帮助 renderer 判断节点大类。
- `patchFlag`：编译器提供的动态更新提示。
- `el`：挂载后关联的宿主节点。
- `dynamicChildren`：block 收集到的动态子节点。

### 2. 编译优化不等于没有 Diff

Vue 3 仍然调用 `patch()` 和子节点 Diff。编译器提供静态提升、patch flag、block tree 和 dynamic children，让运行时跳过一部分不可能变化的节点。

`packages/shared/src/patchFlags.ts` 中的常见提示包括：

| Flag | 意义 |
|---|---|
| `TEXT` | 动态文本 |
| `CLASS` | 动态 class |
| `STYLE` | 动态 style |
| `PROPS` | 指定动态 props |
| `FULL_PROPS` | 需要更完整的 props 比较 |
| `CACHED` | 缓存的静态 VNode |
| `BAIL` | 放弃当前优化路径 |

具体数值应以当前版本源码为准。

## 七、setupRenderEffect：组件更新的核心

### 1. 创建 ReactiveEffect 和 scheduler

源码位置：`C:\Project\vue源码\core\packages\runtime-core\src\renderer.ts:1596-1621`

```ts
const effect = (instance.effect = new ReactiveEffect(componentUpdateFn))
const update = (instance.update = effect.run.bind(effect))
const job = (instance.job = effect.runIfDirty.bind(effect))
job.i = instance
job.id = instance.uid
effect.scheduler = () => queueJob(job)

update()
```

这里有三个层次：

- `componentUpdateFn`：组件首次挂载和后续更新真正执行的函数。
- `ReactiveEffect`：负责依赖记录、重新运行和停止。
- `scheduler/job`：把更新放入队列，避免每次修改都同步重跑。

### 2. 首次执行

源码位置：`renderer.ts:1322-1465`

```text
beforeMount
  ↓
renderComponentRoot(instance)
  ↓
instance.subTree = VNode
  ↓
patch(null, subTree, container, ...)
  ↓
mounted 回调进入 post-render 队列
  ↓
instance.isMounted = true
```

### 3. 后续更新

源码位置：`renderer.ts:1473-1588`

```text
处理 next VNode / props / slots
  ↓
beforeUpdate
  ↓
renderComponentRoot(instance) → nextTree
  ↓
prevTree = instance.subTree
instance.subTree = nextTree
  ↓
patch(prevTree, nextTree, ...)
  ↓
updated 回调进入 post-render 队列
```

组件自己的响应式状态变化和父组件传入的新 props，都会汇入这条组件更新函数。

## 八、patch 的节点分流

源码位置：`C:\Project\vue源码\core\packages\runtime-core\src\renderer.ts:379-470`

```text
Text      → processText
Comment   → processCommentNode
Static    → mountStaticNode / patchStaticNode
Fragment  → processFragment
Element   → processElement
Component → processComponent
Teleport  → Teleport.process
Suspense  → Suspense.process
```

`patch()` 首先判断：

1. `n1 === n2`：无需处理。
2. 新旧 VNode 类型不同：卸载旧树，再挂载新树。
3. 类型相同：进入对应节点的更新逻辑。

### keyed children

源码位置：`renderer.ts:1917-2045`

复杂列表更新时，Vue 会建立新节点的 key 映射，寻找可以复用的旧节点，卸载消失的节点，并在节点移动时使用最长递增子序列减少移动次数。

`key` 的作用是帮助 Vue 判断节点身份，不只是为了消除控制台警告。

## 九、响应式触发和 scheduler

### 1. 依赖收集

源码位置：`C:\Project\vue源码\core\packages\reactivity\src\effect.ts:87-214`

```text
effect.run()
  → 当前 effect 成为 active subscriber
  → render 读取响应式数据
  → dep 记录这个 effect
  → 本轮结束后清理没有再次读取的旧依赖
```

这解释了为什么 `v-if` 分支切换后，组件的依赖会随实际读取的数据变化。

### 2. trigger 进入调度器

组件渲染 effect 设置了 scheduler，因此数据变化通常走：

```text
响应式数据变化
  ↓
ReactiveEffect.trigger()
  ↓
effect.scheduler()
  ↓
queueJob(instance.job)
```

### 3. queueJob 和 flushJobs

源码位置：

- `C:\Project\vue源码\core\packages\runtime-core\src\scheduler.ts:99-121`
- `C:\Project\vue源码\core\packages\runtime-core\src\scheduler.ts:173-268`

`queueJob()` 会去重并安排 Promise 微任务；`flushJobs()` 执行主队列，并处理 post-flush 回调。连续多次修改同一状态时，更新通常会被合并到同一轮刷新中。

## 十、卸载与 Hydration

### 卸载

源码位置：`renderer.ts:2160-2205`、`renderer.ts:2333-2388`

组件卸载不只是移除 DOM，还会停止组件 effect scope，清理子树、监听和生命周期相关资源。

### SSR Hydration

普通挂载：

```text
render → patch(null, vnode)
```

服务端已经输出 HTML 时，客户端会使用 hydration renderer，把已有 DOM 和首次生成的 VNode 对齐，而不是无条件重新创建全部 DOM。

## 十一、Vue 2 与 Vue 3 的关键差异

| 对比项 | Vue 2 | Vue 3 |
|---|---|---|
| 响应式核心 | 主要使用 `Object.defineProperty` | `Proxy`、`ReactiveEffect` |
| 组件更新单位 | 渲染 Watcher | 每个组件一个渲染 ReactiveEffect |
| 更新调度 | Watcher queue | `queueJob()` / `flushJobs()` |
| 平台抽象 | 平台耦合更明显 | runtime-core 注入 host operations |
| 编译优化 | 静态节点优化 | patch flags、静态提升、block tree、dynamic children |
| 内置节点类型 | 组件和元素为主 | 增加 Fragment、Teleport、Suspense |

## 十二、源码阅读路线

```text
runtime-dom/src/index.ts
  ↓ createApp 使用的 renderer
runtime-core/src/apiCreateApp.ts
  ↓ app.mount 创建根 VNode
runtime-core/src/renderer.ts
  ↓ render → patch → processComponent / processElement
runtime-core/src/component.ts
  ↓ setup 和 render 函数
runtime-core/src/renderer.ts
  ↓ mountComponent → setupRenderEffect → componentUpdateFn
reactivity/src/effect.ts + runtime-core/src/scheduler.ts
  ↓ 依赖触发、排队和刷新
compiler-core/src/compile.ts / transform.ts / codegen.ts
  ↓ 模板编译和 patch flag
```

## 十三、常见误区

1. Vue 3 没有 Diff。——错误，仍然有 `patch()` 和子节点 Diff。
2. `ReactiveEffect` 触发就立即执行 render。——通常会先经过 scheduler 和更新队列。
3. VNode 就是真实 DOM。——VNode 是 JavaScript 描述对象。
4. 模板总是在浏览器运行时编译。——`.vue` 模板通常在构建阶段编译。
5. runtime-core 直接调用 `document.createElement`。——DOM 操作由 runtime-dom 注入。
6. `updated` 一定在 patch 同步结束的下一行执行。——回调通常进入 post-render 队列。

## 十四、官方资料和源码索引

- [Vue：渲染机制](https://vuejs.org/guide/extras/rendering-mechanism.html)
- [Vue：响应式基础](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Vue：生命周期钩子](https://vuejs.org/guide/essentials/lifecycle.html)
- [Vue：渲染函数与 JSX](https://vuejs.org/guide/extras/render-function.html)

本地源码根目录：`C:\Project\vue源码\core`

- `packages/runtime-dom/src/index.ts`
- `packages/runtime-core/src/apiCreateApp.ts`
- `packages/runtime-core/src/renderer.ts`
- `packages/runtime-core/src/component.ts`
- `packages/runtime-core/src/scheduler.ts`
- `packages/runtime-core/src/vnode.ts`
- `packages/reactivity/src/effect.ts`
- `packages/compiler-core/src/compile.ts`
- `packages/compiler-core/src/transform.ts`
- `packages/compiler-core/src/codegen.ts`

## 一句话总结

Vue 3 先把模板变成 render 函数，组件首次执行 render 生成 VNode 并通过 patch 创建真实 DOM；响应式依赖变化后，ReactiveEffect 进入 scheduler 队列，组件重新 render，patch 比较新旧 VNode，并把差异应用到真实 DOM。
