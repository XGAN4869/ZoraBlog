## 一、整体分层

Vue 的流程可以分成三个阶段：

```text
构建阶段
  template
    ↓
  AST
    ↓
  transform
    ↓
  generate
    ↓
  真正可执行的 render 函数

首次渲染阶段
  setup
    ↓
  setupRenderEffect 组装响应式渲染环境
    ↓
  instance.update()
    ↓
  effect.run()
    ↓
  render
    ↓
  得到 VNode
    ↓
  patch(null, VNode)
    ↓
  创建真实 DOM

更新阶段
  用户事件修改响应式数据
    ↓
  trigger
    ↓
  scheduler / queueJob
    ↓
  effect.run()
    ↓
  重新执行 render
    ↓
  得到新的 VNode
    ↓
  patch(oldVNode, newVNode)
    ↓
  更新真实 DOM
```

三个阶段的职责不同：

- 构建阶段：负责把 `template` 制造成 `render`。
- 首次渲染阶段：负责第一次执行 `render` 并创建 DOM。
- 更新阶段：负责响应式数据变化后的重新渲染和 DOM 更新。

---

## 二、构建阶段：制造真正的 `render` 函数

```text
template
  ↓ parse
AST
  ↓ transform
识别事件、插值和动态文本
  ↓ generate
render 函数源码
  ↓
构建为 JavaScript 模块
  ↓
真正的 render 函数
```

例如：

```vue
<button @click="add">{{ count }}</button>
```

经过编译后，概念上会得到类似这样的函数：

```js
function render(_ctx, _cache) {
  return (
    _openBlock(),
    _createElementBlock(
      'button',
      {
        onClick: _ctx.add
      },
      _toDisplayString(_ctx.count),
      1 // TEXT：文本是动态内容
    )
  )
}
```

这里需要区分四个东西：

```text
render 函数源码
  ↓ 构建工具处理
真正的 render 函数
  ↓ 执行 render
VNode
  ↓ patch
真实 DOM
```

所以：

- `generate` 不会直接生成 VNode。
- `render` 不会直接创建真实 DOM。
- 只有调用 `render` 后才会得到 VNode。
- 只有 `patch` 执行后才会操作真实 DOM。
- `patchFlag` 是编译器提供给 patch 阶段的优化提示，不会阻止 render 执行。

---

## 三、首次渲染阶段

### 1. `setup` 准备组件状态

```text
setup 得到 count 和 add
  ↓
组件实例保存 setup 状态和 render 函数
```

示例：

```js
const count = ref(0)

function add() {
  count.value++
}
```

此时只是准备好了状态和方法，还没有开始执行组件渲染。

---

### 2. `setupRenderEffect` 负责组装

```text
setupRenderEffect(instance)
  ↓
内部定义 componentUpdateFn
  ↓
创建 ReactiveEffect
  ↓
把 effect.run 绑定为 instance.update
  ↓
配置 scheduler
  ↓
首次调用 instance.update()
```

可以简化为：

```js
function setupRenderEffect(instance) {
  function componentUpdateFn() {
    if (!instance.isMounted) {
      const subTree = renderComponentRoot(instance)

      instance.subTree = subTree

      patch(null, subTree)

      instance.isMounted = true
    } else {
      const prevTree = instance.subTree
      const nextTree = renderComponentRoot(instance)

      instance.subTree = nextTree

      patch(prevTree, nextTree)
    }
  }

  const effect = new ReactiveEffect(
    componentUpdateFn,
    () => queueJob(instance.update)
  )

  instance.effect = effect
  instance.update = effect.run.bind(effect)

  // 到这里才真正开始首次渲染
  instance.update()
}
```

这里要区分两个阶段：

```text
setupRenderEffect()
  └─ 组装阶段：准备函数、effect 和 scheduler

instance.update()
  └─ 执行阶段：真正进入 effect.run()
```

---

### 3. `instance.update()` 实际执行 `effect.run()`

```text
instance.update()
  ↓
effect.run()
```

`ReactiveEffect.run()` 主要负责建立当前响应式执行环境：

```text
effect.run()
  ↓
设置 activeEffect = 当前 ReactiveEffect
  ↓
开启依赖追踪
  ↓
执行 componentUpdateFn()
```

`ReactiveEffect` 本身不直接生成 VNode，它只是让 `componentUpdateFn` 具备：

- 依赖收集能力；
- 被 `trigger` 找到的能力；
- 被 scheduler 重新调度的能力。

---

### 4. `componentUpdateFn` 进入首次挂载分支

首次执行时：

```text
instance.isMounted === false
```

因此执行：

```text
componentUpdateFn()
  ↓
renderComponentRoot(instance)
  ↓
instance.render(...)
  ↓
得到 subTree VNode
  ↓
保存 instance.subTree
  ↓
patch(null, subTree)
  ↓
创建真实 DOM
```

---

### 5. `renderComponentRoot` 调用真正的 `render`

```js
function renderComponentRoot(instance) {
  const { render, proxy } = instance

  const rawVNode = render.call(
    proxy,
    proxy,
    instance.renderCache
  )

  return normalizeVNode(rawVNode)
}
```

调用关系是：

```text
effect.run()
  ↓
componentUpdateFn()
  ↓
renderComponentRoot(instance)
  ↓
instance.render.call(instance.proxy, ...)
  ↓
返回 VNode
```

因此：

- `renderComponentRoot` 不是 `render`。
- `renderComponentRoot` 是调用和整理 `render` 返回值的包装器。
- `render` 才是真正根据当前状态生成 VNode 的函数。
- `render` 执行时，外层 `effect.run()` 已经设置好了 `activeEffect`。

---

### 6. `render` 读取响应式数据并触发 `track`

当 render 执行：

```js
_ctx.count
```

或者读取：

```js
count.value
```

就会进入响应式 getter：

```text
读取 count.value
  ↓
ref getter
  ↓
track()
  ↓
记录：
count.value → 当前组件 ReactiveEffect
```

注意：

```text
创建 ReactiveEffect
```

不等于：

```text
已经完成依赖收集
```

只有当 effect 真正运行，并且 render 真正读取响应式数据时，依赖关系才会建立。

---

### 7. 首次 `patch` 创建 DOM

render 返回：

```text
buttonVNode
```

组件更新函数随后执行：

```js
patch(null, buttonVNode)
```

因为没有旧 VNode，所以主要工作是：

```text
判断 VNode 类型
  ↓
创建 button 元素
  ↓
设置属性和事件
  ↓
处理文本子节点
  ↓
插入挂载容器
```

首次渲染完整链路：

```text
setup 得到 count 和 add
  ↓
setupRenderEffect
  ↓
创建组件 ReactiveEffect
  ↓
instance.update()
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
  ↓
instance.isMounted = true
```

---

## 四、点击更新阶段

### 1. 点击事件修改响应式数据

```text
点击 button
  ↓
执行 add()
  ↓
count.value++
  ↓
ref setter
  ↓
trigger()
```

`trigger()` 会找到首次 render 时收集到的组件 `ReactiveEffect`：

```text
count.value
  └── 组件 ReactiveEffect
```

---

### 2. scheduler 把更新任务放入队列

Vue 通常不会在 setter 内立即同步执行完整渲染，而是：

```text
trigger()
  ↓
effect.scheduler()
  ↓
queueJob(instance.update)
  ↓
更新任务进入队列
  ↓
微任务阶段批量刷新
```

这样连续修改多个响应式值时，可以合并同一个组件的重复更新。

---

### 3. 队列刷新后重新执行 `effect.run()`

```text
queueJob
  ↓
instance.update()
  ↓
effect.run()
  ↓
重新设置 activeEffect
  ↓
重新执行 componentUpdateFn()
```

这一次：

```text
instance.isMounted === true
```

因此进入更新分支。

---

### 4. `componentUpdateFn` 执行更新分支

```text
componentUpdateFn()
  ↓
保存旧 VNode：prevTree
  ↓
renderComponentRoot(instance)
  ↓
重新执行 instance.render(...)
  ↓
读取新的 count.value
  ↓
得到新 VNode：nextTree
  ↓
保存 instance.subTree = nextTree
  ↓
patch(prevTree, nextTree)
```

完整表示为：

```js
const prevTree = instance.subTree
const nextTree = renderComponentRoot(instance)

instance.subTree = nextTree

patch(prevTree, nextTree)
```

---

### 5. `patch` 对比新旧 VNode 并更新 DOM

```text
patch(oldVNode, newVNode)
  ↓
比较节点类型和 key
  ↓
比较动态 props、事件和子节点
  ↓
根据 patchFlag 缩小检查范围
  ↓
更新真正发生变化的 DOM
```

对于：

```vue
<button>{{ count }}</button>
```

如果只有文本发生变化，编译器可能提供：

```js
1 // TEXT
```

patch 阶段就可以重点更新按钮文本。

但要注意：

```text
patchFlag 不会让 render 跳过执行
```

更新前仍然需要重新执行 render，得到新的 VNode；`patchFlag` 主要帮助 patch 更快地找到需要更新的部分。

---

## 五、首次渲染与点击更新的合并流程

### 首次渲染

```text
setup
  ↓
setupRenderEffect 组装
  ↓
instance.update()
  ↓
effect.run()
  ↓
设置 activeEffect
  ↓
componentUpdateFn()
  ↓
首次挂载分支
  ↓
renderComponentRoot(instance)
  ↓
instance.render(...)
  ↓
读取 count.value
  ↓
track()
  ↓
得到 subTree VNode
  ↓
patch(null, subTree)
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
ref setter
  ↓
trigger()
  ↓
找到组件 ReactiveEffect
  ↓
scheduler → queueJob
  ↓
微任务刷新更新队列
  ↓
instance.update()
  ↓
effect.run()
  ↓
重新设置 activeEffect
  ↓
componentUpdateFn()
  ↓
更新分支
  ↓
保存旧 subTree
  ↓
renderComponentRoot(instance)
  ↓
重新执行 render
  ↓
读取新的 count.value
  ↓
得到新的 VNode
  ↓
patch(oldTree, newTree)
  ↓
根据 Diff 和 patchFlag 更新真实 DOM
```

---

## 六、最终职责划分

```text
构建工具
  └─ 把 template 变成 render

ReactiveEffect
  └─ 决定 render 何时执行，并提供依赖追踪环境

componentUpdateFn
  └─ 判断是首次挂载还是后续更新

renderComponentRoot
  └─ 调用 instance.render，并标准化根 VNode

render
  └─ 根据当前状态生成 VNode

track
  └─ 记录响应式数据与当前组件 effect 的关系

trigger
  └─ 找到依赖该数据的 effect

scheduler / queueJob
  └─ 安排组件更新时机

patch
  └─ 根据 VNode 创建或更新真实 DOM
```

一句话总结：

```text
构建阶段制造 render；
setupRenderEffect 组装 ReactiveEffect；
effect.run 执行 componentUpdateFn；
componentUpdateFn 调用 renderComponentRoot；
renderComponentRoot 调用 render 生成 VNode；
首次通过 patch(null, VNode) 创建 DOM；
更新通过 trigger、scheduler 重新执行 render；
最后通过 patch(oldVNode, newVNode) 更新 DOM。
```