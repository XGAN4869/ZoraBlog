# TS8：内置对象与 Canvas 代码雨

## 开篇速记卡：用浏览器内置对象绘制动画

本例把 TypeScript 与浏览器提供的对象结合起来：

1. 使用 `document` 获取 `<canvas>`。
2. 使用 `HTMLCanvasElement` 和 `CanvasRenderingContext2D` 相关能力设置画布。
3. 使用数组保存每一列数字雨的纵坐标。
4. 使用定时器反复调用 `rain`，形成动画。

## 学习目标

这一篇可以沿着“状态 + 每帧绘制 + 动画调度”来理解：

- `str` 保存可以出现的字符。
- `Arr` 保存每一列当前下落到哪里。
- `rain` 读取并更新状态，同时绘制一帧。
- `setInterval` 负责让一帧又一帧连续发生。

最终要能解释：为什么半透明矩形会产生拖尾，以及数组中的一个数字怎样控制屏幕上的一列字符。

## 一、效果预览

![[Pasted image 20260819134934.png]]

## 二、获取 Canvas 与绘图上下文

### 1. 获取画布元素

```js
let canvas = document.querySelector<HTMLCanvasElement>('canvas')!
let ctx = canvas.getContext('2d')!
```

`document.querySelector` 用来查询页面元素。尖括号中的 `HTMLCanvasElement` 是类型参数，表示查询结果按 Canvas 元素理解。

末尾的 `!` 是非空断言，表示这里假设查询结果不会是 `null`。如果页面中没有对应元素，运行时仍然可能出错，所以 HTML 中需要准备 `<canvas>`。

### 2. 设置画布尺寸

```js
canvas.width = screen.availWidth
canvas.height = screen.availHeight
```

画布宽度和高度分别取可用屏幕宽高，使代码雨尽量铺满屏幕。

> [!WARNING] 原文观察：屏幕尺寸不等于浏览器视口
> `screen.availWidth` / `screen.availHeight` 描述的是可用屏幕区域，而 Canvas 实际显示在浏览器页面中。浏览器不是全屏时，画布可能大于当前视口。若目标是铺满网页可视区域，可以继续了解 `window.innerWidth`、`window.innerHeight` 和元素自身尺寸。

> [!NOTE]
> 修改 `canvas.width` 或 `canvas.height` 不只是改变 CSS 显示大小，它还会重置画布内部的绘图缓冲区和上下文状态。因此尺寸通常应在正式绘制前设置。

## 三、准备数字雨数据

### 1. 准备字符池

```js
let str: string[] = 'XMZSWZS010101'.split('')
```

字符串通过 `split('')` 被拆成字符数组，后面绘制每个字符时会从这个数组中随机取值。

### 2. 为每一列准备纵坐标

```js
let Arr = Array(Math.ceil(canvas.width / 10)).fill(0)
console.log(Arr);
```

每一列数字雨之间大约相隔 `10` 像素，因此用 `canvas.width / 10` 估算列数。`fill(0)` 让每一列都从纵坐标 `0` 开始。

### 3. `Arr` 是动画的状态

可以把 `Arr` 理解为一张“列号 → 当前纵坐标”的表：

| 数组内容 | 表示的画面状态 |
|---|---|
| `Arr[0] = 0` | 第 0 列从顶部开始 |
| `Arr[1] = 40` | 第 1 列当前画到纵坐标 40 |
| `Arr[index] += 10` | 这一列下一帧向下移动 10 像素 |
| `Arr[index] = 0` | 这一列回到顶部重新开始 |

动画并不是“字符自己会移动”，而是每一帧都在新的纵坐标重新绘制字符。

## 四、编写下落动画函数

### 1. 声明每帧执行的函数

```js
//下落动画函数，每一帧执行一次，绘制一屏数字雨
const rain = () => {
    ctx.fillStyle = 'rgba(0,0,0,0.05)' //拖尾效果核心
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0f0'
    Arr.forEach((item, index) => {
        ctx.fillText(str[Math.floor(Math.random() * str.length)], index * 10, item + 10)
        Arr[index] = item > canvas.height || item > 10000 * Math.random() ? 0 : item + 10
    })
}
```

### 2. 绘制半透明背景

```js
ctx.fillStyle = 'rgba(0,0,0,0.05)' //拖尾效果核心
ctx.fillRect(0, 0, canvas.width, canvas.height)
```

半透明黑色不会完全覆盖上一帧，因此旧字符会逐渐变淡，形成拖尾效果。

### 3. 设置绿色文字

```js
ctx.fillStyle = '#0f0'
```

`#0f0` 是绿色，用作数字雨文字的填充颜色。

### 4. 遍历每一列并绘制字符

```js
Arr.forEach((item, index) => {
    ctx.fillText(str[Math.floor(Math.random() * str.length)], index * 10, item + 10)
    Arr[index] = item > canvas.height || item > 10000 * Math.random() ? 0 : item + 10
})
```

- `index * 10` 控制字符的横坐标，每一列间隔 `10` 像素。
- `item + 10` 控制字符的纵坐标，让字符逐帧向下移动。
- `Math.random()` 与 `Math.floor()` 共同生成字符数组的随机下标。

### 5. 决定是否从顶部重新开始

```js
Arr[index] = item > canvas.height || item > 10000 * Math.random() ? 0 : item + 10
```

当列已经超过画布底部，或者命中随机重置条件时，将纵坐标设为 `0`；否则纵坐标增加 `10`。

> [!NOTE] 随机重置并不是固定概率
> 条件 `item > 10000 * Math.random()` 与当前纵坐标 `item` 有关。`item` 越大，随机数落在它下面的机会越高，因此一列下落得越远，随机回到顶部的概率也会逐渐增加。

### 6. 一帧中发生了什么

```text
覆盖一层半透明黑色
  ↓
为每一列随机选择字符
  ↓
在当前列坐标绘制字符
  ↓
更新这一列的纵坐标
  ↓
等待下一次 rain 调用
```

旧字符没有立即消失，是因为每帧只盖上一层透明度为 `0.05` 的黑色；多次叠加后才会逐渐接近纯黑，于是形成视觉拖尾。

## 五、启动定时动画

```js
setInterval(rain, 40)
```

`setInterval` 每隔 `40` 毫秒调用一次 `rain`，大约每秒执行 `25` 帧，于是连续画面看起来就像数字在下落。

### `setInterval` 与 `requestAnimationFrame`

| 方式 | 特点 | 更适合 |
|---|---|---|
| `setInterval(rain, 40)` | 按指定时间间隔尝试执行 | 学习定时器、简单固定节奏任务 |
| `requestAnimationFrame(loop)` | 浏览器在准备重绘前调用 | 与页面绘制同步的视觉动画 |

**补充思路（与原定时器二选一，不要同时启动）：**

```ts
function loop() {
  rain()
  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
```

`requestAnimationFrame` 通常更适合浏览器动画，但原来的 `setInterval` 更直观，便于观察“每 40 毫秒执行一次”的思路。

## 六、代码执行流程

```text
获取 canvas
  ↓
设置画布大小
  ↓
准备字符数组与列坐标数组
  ↓
rain 清理半透明背景
  ↓
逐列绘制随机字符
  ↓
更新每列纵坐标
  ↓
定时器重复执行
```

## 七、生命周期与资源清理

当前代码启动定时器后没有保存编号，因此页面逻辑结束时无法主动停止它。在组件、弹窗或路由页面中，持续运行的定时器可能继续占用资源。

**补充示例：**

```ts
const timerId = setInterval(rain, 40)

// 不再需要动画时
clearInterval(timerId)
```

如果改用 `requestAnimationFrame`，则保存返回的动画编号，并在离开页面或销毁组件时使用 `cancelAnimationFrame`。

## 八、继续优化时先抽出参数

当前代码中的 `10` 同时承担列间距、下落速度和字符纵向偏移。学习阶段可以保留原写法；继续扩展时，可以先思考把这些含义拆成 `fontSize`、`columnGap`、`fallSpeed` 等独立参数。

> [!TIP]
> 抽参数的目的不是让代码显得复杂，而是避免“改一个 10，却同时改变三种效果”。

## 复习练习

1. `Arr[5] = 70` 表示画面中的哪一列、哪个位置？
2. 把定时间隔从 `40` 改成 `100`，动画节奏会怎样变化？
3. 如果把半透明背景改成完全不透明的黑色，拖尾为什么会消失？
4. 思考浏览器尺寸改变后，当前 `Arr` 的列数为什么不会自动更新。

## 参考资料

- [MDN：Canvas API](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)
- [MDN：Canvas 动画基础](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial/Basic_animations)
- [MDN：requestAnimationFrame](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame)
- [MDN：setInterval](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/setInterval)

## 一句话总结

> Canvas 代码雨的核心是“半透明覆盖制造拖尾 + 数组记录每列位置 + 定时器重复绘制”。
