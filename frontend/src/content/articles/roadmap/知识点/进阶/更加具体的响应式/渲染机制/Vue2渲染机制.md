# Vue 2 渲染机制：从初始化到视图更新

> [!info] 本篇范围
> 原文使用了 `new Vue()`、`Object.defineProperty`、`beforeDestroy` 等写法，因此统一按 **Vue 2** 理解。Vue 3 的响应式实现、生命周期名称以及编译优化不同，不能直接套用本文流程。

## 学习目标

- 能说清模板、`render` 函数、VNode 和真实 DOM 之间的关系。
- 能区分“构建时预编译”和“浏览器运行时编译”。
- 能解释首次挂载时如何收集依赖，以及数据变化后为什么会重新渲染。
- 能把生命周期钩子放到初始化、挂载、更新、销毁四个阶段中。

## 开篇速记卡

Vue 2 的核心链路可以先记成：

```text
初始化状态并转换为响应式数据
        ↓
获得 render 函数（手写 / 构建时预编译 / 运行时编译）
        ↓
创建渲染 Watcher
        ↓
执行 render：读取响应式数据、收集依赖、生成 VNode
        ↓
执行 patch：首次创建 DOM，更新时比较新旧 VNode 后修改 DOM
        ↓
数据再次变化 → setter 通知依赖 → Watcher 进入异步更新队列 → 重新渲染
```

> [!tip] 最容易混淆的三个对象
> - **模板**：给人阅读的声明式 HTML。
> - **render 函数**：执行后返回 VNode；模板必须先变成它才能参与渲染。
> - **VNode**：描述界面结构的 JavaScript 对象，不是真实 DOM。

## 一、原始笔记（完整保留）

下面完整保留原始流程图、总结和分阶段笔记；后续“原文观察”负责校正容易产生误解的地方。

```markdown
new Vue()
   │
   ├─ beforeCreate
   │    初始化事件、生命周期，但数据还未响应式
   │
   ├─ created
   │    数据已观测（响应式），可访问 data、methods，但未编译模板，$el 不可用
   │
   ├─ 检查 el 选项？
   │    ├─ 无 el → 实例化后停在 created阶段，等待手动 vm.$mount(el)
   │    └─ 有 el new Vue({el}) → 自动进入编译/挂载流程，相当于 new Vue().$mount(el)
   │
   ├─ 确定模板来源（优先级：render > template > el.outerHTML）单文件中当你使用.vue 文件，里面的<template>会在构建阶段由 vue-loader 预编译成render函数，最终打包后的组件会包含 render 函数，就像你手写的一样，所以你运行时 Vue 看到的也是线程的 render。
   │    • 若有 render 函数，直接使用（跳过编译，因为render本身就是编译后的产物，能直接调用 createElement生成虚拟 DOM）
   │    • 若有 template，编译成 render
   │    • 否则取 el.outerHTML 编译
   │
   ├─ beforeMount
   │    此时已拥有 render 函数，即将首次执行 render 生成 VNode
   │
   ├─ 创建渲染 Watcher，执行 render 函数（这里的render既有手写的又有上面模板编译的）
   │    • 首次执行 render 时，会访问模板中用到的响应式属性，触发它们的 getter，将当前渲染Watcher 收集到这些属性的 Dep 中。这就是 依赖收集：建立“数据 → 视图”的映射关系。
   │    • 访问响应式数据，触发 getter，完成依赖收集（将当前 Watcher 加入 Dep）
   │    • 生成虚拟 DOM（VNode）
   │
   ├─ 首次 patch（虚拟 DOM 转真实 DOM）[这里还不需要diff 毕竟没有新旧节点对比]
   │    • 这里开始 el 将模板或渲染函数生成的内容真正放入挂载点
   │    • 将 VNode 映射为真实 DOM 并替换挂载点内容
   │    • vm.$el 指向新生成的 DOM 元素
   │
   ├─ mounted
   │    组件已挂载，可访问 DOM，首次渲染完成
   │
   ├─ （数据变化时）
   │    ├─ 触发 setter → Dep 通知渲染 Watcher 重新执行
   │    ├─ beforeUpdate（数据已变，DOM 未更新）
   │    ├─ 重新执行 render，生成新 VNode，Diff 并 patch 真实 DOM
   │    └─ updated（DOM 更新完成）
   │
   └─ beforeDestroy / destroyed（组件销毁，清理 Watcher 等）
```

> “Vue 的挂载是一个从 **模板编译** 到 **依赖收集**，再到 **虚拟** **DOM** **渲染** 的过程。
> 
> 首先，Vue 会将模板解析为 **AST** 并生成 **Render 函数**。在初始化阶段，通过 **响应式系统** 拦截数据，并为组件创建一个渲染 **Watcher**。
> 
> 当挂载开始时，会触发 `updateComponent`。它首先运行 `render` 函数生成 **VNode**，随后进入 `patch` 阶段。如果是首次渲染，则直接将 VNode 映射为 **真实** **DOM** 并挂载；如果是数据更新，则通过 **Diff 算法** 对比新旧 VNode，实现最小化的 DOM 操作。”

1. 模板编译阶段（Compile Time）也就是生成render函数的那边
    
    1. 解析（parse）：利用正则解析模板，将 HTML 字符转换成 AST 抽象语法树
        
    2. 优化（Optimize）：遍历 AST，标记其中的静态节点（Static Nodes）在后续的 Patch 算法（Diff）中可以跳过对比，提升性能
        
    3. 生成（Generate）：将优化后的 AST 转化成 渲染函数（Render Function）
        
    
      面试：为什么推荐用 webpack/vite 配合.vue 文件？
    
      答：因为 webPack和vite 通过 [vue-loader](https://ganzora2421.feishu.cn/wiki/AUo3wp3dwivQqhkqFrBcon2In3e?fromScene=spaceOverview#share-IwTRdnxTso71xlxcf8ecrOjynMg)🔗 在编译时就完成了这一步，不需要在浏览器运行体积更大的编译器。
    
2. 逻辑初始化 与 响应式绑定（Init Phase）
    

在调用 _init 方法时， Vue 会建立数据与视图的桥梁

1. **数据劫持（****拦截器****）：**调用 Object.defineProperty（Vue2）对 data 进行递归处理，转化为 Getter/Setter
    
2. **依赖收集（Watcher）：**实例化一个 渲染Watcher（当拦截器发现数据变了，它会通知 Watcher）。当 Render 函数执行时，会触发 Data 的 Getter，从而将该 Watcher 收集到对应的 Dep（依赖搜集器）中
    

3. 渲染 与 VNode 转换（Render & Patch Phase）
    
      这是将逻辑代码转化为真实 DOM 的关键路径
    
    2. 生成 VNode：执行 render 函数，返回一个 VNode（虚拟节点树）。它是一个描述真实 DOM 结构的普通 JS 对象。
        
    3. 补丁算法（Patch/Diff）
        
        1. 首次挂载：直接根据 VNode 递归创建真实 DOM 元素，并插入到页面容器（如#app）中。
            
        2. 后续更新：当数据变化触发 Watcher 重新运行 render时，Vue 会对比 新旧 VNode，通过Diff 算法计算出最小变更
            
        3. 视图更新：调用底层原生 API（如 appendChild 或 insertBefore）将差异应用到真实 DOM 上

## 二、流程图校对

> [!note] 原文观察
> 整体顺序正确：初始化 → 获得 `render` → 创建渲染 Watcher → `render` 生成 VNode → `patch` 真实 DOM → 响应式更新。以下几点需要更精确地理解：
>
> 1. `beforeCreate` 被调用时，生命周期、事件和渲染相关的内部字段已经完成一部分初始化，但 `data`、`computed`、`watch` 等状态尚未初始化；到 `created` 时才可访问这些状态。
> 2. `.vue` 文件中的模板通常在**构建时**预编译；直接给带编译器的 Vue 运行时传入 `template`，则会在**挂载时**编译。两者最终都会得到 `render` 函数。
> 3. 首次渲染也会进入 `patch`。只是此时没有“上一棵组件 VNode 树”可供常规更新 Diff；Vue 会以真实挂载元素和新的 VNode 为输入，创建并替换/挂载真实 DOM。因此“首次不需要新旧 VNode Diff”可以作为直觉记忆，但不能理解为“不执行 patch”。
> 4. setter 并不是每触发一次就立刻同步重新渲染。Vue 2 会将渲染 Watcher 放入异步队列，同一轮事件循环中的多次修改会被去重、批量刷新。
> 5. `mounted` 表示当前实例已经完成挂载，但若要等待一次状态修改引起的 DOM 更新，应使用 `vm.$nextTick()`，不要在赋值后的下一行直接读取更新结果。

### 一份更严谨的 Vue 2 执行顺序

```text
new Vue(options)
  ↓
初始化实例内部能力
  ↓
beforeCreate
  ↓
初始化 injections、props、methods、data、computed、watch，并观测数据
  ↓
created
  ↓
有 el：自动 $mount(el)；无 el：等待手动 $mount(el)
  ↓
确定 render 来源
  ├─ 已有 render：直接使用
  ├─ 有 template：运行时编译为 render（仅带编译器的构建）
  └─ 否则：将 el.outerHTML 作为模板编译（仅带编译器的构建）
  ↓
beforeMount
  ↓
创建渲染 Watcher，并立即执行首次更新函数
  ├─ vm._render()：读取响应式数据、收集依赖、生成 VNode
  └─ vm._update()：调用 patch 创建真实 DOM
  ↓
mounted
  ↓
响应式数据变化
  ↓
setter → Dep 通知 Watcher → Watcher 进入调度队列
  ↓
beforeUpdate → 重新 render → 新旧 VNode patch → updated
  ↓
beforeDestroy → 拆除 Watcher、子组件和监听等 → destroyed
```

## 三、原始总结与术语校正

> [!note] 原文观察
> - 原文总结的主线是正确的。
> - “初始化阶段……并为组件创建一个渲染 Watcher”需要拆成两个时间点：响应式状态在 `_init` 中建立；**渲染 Watcher 在 `$mount` 的 `mountComponent` 阶段创建**。
> - “最小化的 DOM 操作”适合表达优化目标，但不应理解为 Vue 会计算数学意义上的全局最少操作。Vue 2 使用同层比较、节点类型与 `key` 等信息进行启发式更新。
> - `updateComponent` 可以用下面的源码级心智模型理解：先执行 `vm._render()` 得到 VNode，再执行 `vm._update()`，由后者进入 `patch`。

## 四、模板如何变成 render 函数

### 模板编译阶段校对

> [!warning] 原文观察
> 1. 这里的 “Compile Time” 不能一概理解为项目构建期。使用 `.vue` 文件时通常是**构建时预编译**；使用完整版 Vue 并传入 `template` 时，也可能在浏览器的**挂载阶段运行时编译**。
> 2. “利用正则解析模板”过于简化。Vue 2 编译器会通过解析器识别标签、属性、指令、插值和文本等内容，其中会用到正则，但不是靠一个正则表达式直接把 HTML 变成 AST。
> 3. webpack 处理 `.vue` 文件时使用 `vue-loader`；Vite 使用对应的 Vue 插件，不是通过 `vue-loader`。原文链接可以继续作为个人资料入口，但这句工具归属需要区分。

**三步的正确记忆方式：**

| 阶段 | 输入 → 输出 | 主要作用 |
|---|---|---|
| Parse | 模板字符串 → AST | 识别元素、属性、指令、插值和文本 |
| Optimize | AST → 带静态标记的 AST | 找出可复用的静态节点/静态根，减少后续工作 |
| Generate | AST → 代码字符串 | 生成 `render` 与静态渲染函数所需的代码 |

### 构建时编译与运行时编译

| 场景 | 编译发生在哪里 | 浏览器是否需要模板编译器 |
|---|---|---|
| `.vue` 单文件组件 | 构建工具处理项目时 | 通常不需要，可使用体积更小的 runtime-only 构建 |
| 浏览器中传入 `template` | 应用挂载时 | 需要 runtime + compiler 构建 |
| 手写 `render` | 无需模板编译 | 不需要 |

## 五、实例初始化与依赖收集

### 初始化阶段校对

> [!note] 原文观察
> - Vue 2 对对象属性主要使用 `Object.defineProperty` 转换 getter/setter；对数组还会改写能改变数组内容的方法，因此不能只把它理解成“给所有值加 setter”。
> - `_init` 会完成状态初始化和数据观测，但渲染 Watcher 要等到挂载阶段才创建。
> - 更准确的通知方向是：**响应式属性的 setter 通知它对应的 Dep，Dep 再通知已经订阅的 Watcher**。
> - 依赖不是提前扫描模板得到的。首次执行 `render` 时，当前渲染 Watcher 成为活动目标；代码实际读取了哪些响应式属性，就向哪些属性对应的 Dep 订阅。

**依赖收集与派发更新：**

```text
首次 render
  → 读取 message
  → message 的 getter 执行
  → message 对应的 Dep 收集当前渲染 Watcher

修改 message
  → message 的 setter 执行
  → Dep.notify()
  → 渲染 Watcher 进入调度队列
  → 下一轮刷新时重新 render 和 patch
```

> [!tip] 动态分支也会影响依赖
> 如果某个响应式属性只在 `v-if` 的某一条分支中被读取，那么分支切换后，下一次渲染会重新收集依赖，并清理已经不再使用的旧依赖。

## 六、从 VNode 到真实 DOM

### Render 与 Patch 阶段校对

> [!note] 原文观察
> - “执行 `render` 返回 VNode”与“由 `patch` 把变化应用到 DOM”的描述正确。
> - 首次挂载也调用 `patch`，只是它和后续更新接收的旧节点类型不同。
> - 后续更新不是每次 setter 后立即发生，而是经过 Watcher 调度队列。
> - `key` 是节点身份的重要线索。列表更新时使用稳定且唯一的 `key`，可以减少节点复用错误；不要把数组下标当作所有场景下都可靠的身份标识。

### 首次挂载与后续更新对比

| 对比项 | 首次挂载 | 后续更新 |
|---|---|---|
| 旧输入 | 根实例通常是挂载元素；子组件可无旧 VNode | 上一次生成的 VNode |
| 新输入 | 首次 render 产生的 VNode | 本次 render 产生的新 VNode |
| 主要任务 | 创建真实 DOM 并建立组件 DOM | 比较新旧 VNode，只修改需要变化的部分 |
| 对应钩子 | `beforeMount` → `mounted` | `beforeUpdate` → `updated` |

## 七、常见误区与复习题

### 常见误区

1. **模板就是 VNode。** 错。模板先编译为 `render`，执行 `render` 后才得到 VNode。
2. **数据一改，DOM 立刻同步改变。** 错。Vue 2 会通过异步队列批量刷新；需要读取更新后的 DOM 时使用 `$nextTick()`。
3. **首次渲染不经过 patch。** 错。首次也经过 patch，只是没有上一棵组件 VNode 树进行常规更新比较。
4. **Vue 2 的 Diff 一定得到理论上的最少 DOM 操作。** 不准确。它是在既定比较策略下尽量复用和减少操作。
5. **Vite 也通过 vue-loader 编译 `.vue`。** 错。`vue-loader` 属于 webpack 体系，Vite 使用 Vue 插件。

### 最小复习题

1. 为什么 runtime-only 版本的 Vue 不能直接接收需要在浏览器中编译的 `template`？
2. 首次 `render` 为什么既能生成 VNode，又能完成依赖收集？
3. 同一轮事件循环中连续修改一个响应式值三次，为什么通常只触发一次组件重新渲染？
4. 首次挂载和后续更新都会调用 `patch`，它们的旧输入分别是什么？

## 八、官方资料

- [Vue 2：生命周期图示](https://v2.vuejs.org/v2/guide/instance.html#Lifecycle-Diagram)
- [Vue 2：深入响应式原理](https://v2.vuejs.org/v2/guide/reactivity.html)
- [Vue 2：Render 函数与 VNode](https://v2.vuejs.org/v2/guide/render-function.html)
- [Vue 2：Runtime + Compiler 与 Runtime-only](https://v2.vuejs.org/v2/guide/installation.html#Runtime-Compiler-vs-Runtime-only)
- [Vue 2.7 源码：实例生命周期与挂载](https://github.com/vuejs/vue/blob/v2.7.16/src/core/instance/lifecycle.ts)
- [Vue 2.7 源码：带编译器的 `$mount`](https://github.com/vuejs/vue/blob/v2.7.16/src/platforms/web/runtime-with-compiler.ts)

## 一句话总结

Vue 2 先把模板准备成 `render` 函数，再在渲染 Watcher 执行 `render` 时一边读取响应式数据、收集依赖，一边生成 VNode，最后由 `patch` 完成首次 DOM 创建或后续的差量更新。
