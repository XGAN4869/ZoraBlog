# UI 组件封装与统一主题

本文根据当前博客项目的源码解释。未定位到 IMS-ROUTER 的源码，因此只讨论用户提出的“集中在 theme 中修改主题”这一思路，不推测该项目的具体实现。

## 先回答：为什么不直接统一在 theme 中修改？

应该集中修改主题。主题管理和组件封装解决不同问题：主题统一颜色等视觉规则；组件统一使用方式、默认样式，以及需要复用的交互行为。

如果唯一需求是统一按钮颜色、背景和圆角，CSS 变量与公共样式就可以满足，不一定需要完整组件库。博客当前已经集中定义颜色，但主要定义位置叫 `frontend/src/index.css`，而不是 `theme.css`。

| 文件或目录 | 当前职责 |
| --- | --- |
| `frontend/src/index.css` | 浅色/深色颜色变量、Tailwind 映射、部分全局控件样式 |
| `frontend/src/lib/theme.ts` | 主题类型、共享主题上下文、`useTheme` |
| `frontend/src/components/theme-provider.tsx` | 保存主题状态、切换 HTML 的 dark 类、读写本地存储 |
| `frontend/src/components/ui/base` | 基于 Base UI 或原生元素构建可复用控件 |
| `frontend/src/components/ui` | 其他 UI 控件；与 base 存在同名组件，部分底层实现不同 |

## 这个 function 是干嘛的

React 组件通常就是返回 JSX 的函数。JSX 是在 JavaScript 中描述界面结构的写法。

`ui/base/button.tsx` 的 `Button` 接收按钮属性，将样式选项转换为类名，再交给 Base UI 的按钮渲染。

它属于项目内维护的 UI 组件集合。这里的文件不等于一个已经独立发布的组件库包。基础组件通常不负责请求文章接口、登录业务或文章筛选。

`ThemeProvider` 接收应用内容，把当前主题和切换方法共享给里面的组件，并让浏览器应用对应 CSS 变量。

## 它接收什么数据

`Button` 接收：

- `variant`：按钮样式种类，如 `default`、`outline`、`ghost`。
- `size`：按钮尺寸。
- `className`：调用位置补充的样式类。
- `children`、`onClick`、`disabled` 等：显示内容、点击行为、禁用状态等。

`ThemeProvider` 接收 `children`，也就是它包住的应用内容。主题本身用 `useState` 管理，初始值来自 `localStorage`；当前代码没有有效浅色记录时默认使用深色。

## 它返回什么结果

`Button` 返回一个带统一样式的 `ButtonPrimitive`，它来自 `@base-ui/react/button`。调用者仍能传点击事件和禁用状态。

`ThemeProvider` 返回上下文 Provider，让子组件可以通过 `useTheme()` 获取主题及 `setTheme`。

## 它中间做了哪几步

### Button 的封装过程

1. 引入底层按钮：复用 Base UI 提供的按钮行为。
2. 用 `cva` 定义公共样式、`variant` 和 `size` 对应的样式。
3. 解构接收到的属性，并提供默认样式与默认尺寸。
4. 用 `cn` 合并类名：内部通过 `clsx` 整理类名，再通过 `twMerge` 处理它支持的 Tailwind 类名冲突。
5. 用 `{...props}` 将剩余属性传给底层按钮，保留事件、内容、禁用状态等能力。
6. 导出 `Button`，页面通过 import 使用。

不是每个组件都一样复杂：`Skeleton` 用原生 div 添加加载样式；`Collapsible` 主要透传 Base UI 的折叠组件；`Sidebar` 还组合按钮、抽屉等组件，并管理折叠和移动端状态。

### 背景主题的实际执行过程

1. `App` 使用 `ThemeProvider` 包住应用。
2. 页头通过 `useTheme()` 取得主题与 `setTheme`。
3. 点击主题按钮，调用 `setTheme("light")` 或 `setTheme("dark")`。
4. React 更新主题状态，依赖 `theme` 的 `useEffect` 执行。
5. `document.documentElement.classList.toggle("dark", theme === "dark")` 给 HTML 根元素添加或移除 dark 类。
6. `index.css` 中的 `.dark` 覆盖默认变量；使用这些变量的页面和组件随之换色。
7. 同时更新浏览器的 theme-color 元信息，并把选择写入 `localStorage`。

这里用 React 的 `useState` 管理状态，用 `useEffect` 把状态同步到 DOM 和存储。无需套用 Vue 的 computed、watch 写法。

### 颜色如何从 theme 到按钮

`index.css` 中的 `--primary` 是统一主色；`@theme inline` 中的 `--color-primary: var(--primary)` 让 Tailwind 的 `bg-primary` 使用它。

因此路径是：颜色变量 → Tailwind 颜色映射 → 组件的 bg-primary 类 → 按钮背景。

页面背景使用 `--background`，卡片背景使用 `--card`，侧边栏背景使用 `--sidebar`。统一主题表示这些颜色集中维护、彼此协调，不表示每个区域的背景都相同。

## 小白应该怎么模仿

先写普通元素，明确需要复用什么，再决定是否抽组件。

1. 先确定主题变量：页面背景、文字、主色、卡片背景。
2. 写公共样式，统一圆角、间距和交互状态。
3. 多处需要相同控件接口时，再抽 `Button` 等组件。
4. 确实需要多种样式时，再添加 `variant`。
5. 确实需要共享交互状态时，再考虑上下文或更复杂的组合。

## 示例代码

示例代码仅供参考，需要你手动复制到项目中。这是教学用的简化写法，不是对当前组件的完整替换。

```css
/* 主题集中定义颜色；组件只引用颜色的用途名称。 */
:root {
  --background: #f7f8fa;
  --foreground: #17191f;
  --primary: #285fea;
  --primary-foreground: #ffffff;
}

.dark {
  --background: #0a0b0d;
  --foreground: #f0f1f3;
  --primary: #3975f5;
  --primary-foreground: #ffffff;
}

body {
  background: var(--background);
  color: var(--foreground);
}

.blog-button {
  /* 换主题时换变量，无需逐个改按钮。 */
  background: var(--primary);
  color: var(--primary-foreground);
  border: 0;
  border-radius: 8px;
  padding: 8px 16px;
}
```

```tsx
import type { ComponentProps } from "react";

function BlogButton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      // 给所有调用位置提供默认样式，同时允许补充类名。
      className={`blog-button ${className}`}
      // 透传 children、onClick、disabled 等原生按钮属性。
      {...props}
    />
  );
}

// 页面决定业务行为，基础按钮负责显示和通用控件能力。
export function Example() {
  return <BlogButton onClick={() => alert("查看文章")}>查看文章</BlogButton>;
}
```

## 举一反三

这类 UI 组件通常先确定接收哪些属性，再处理默认样式或样式变体，最后透传其他属性并返回界面。

主题值适合集中在 CSS 中；可复用控件样式适合放在公共样式或组件中；文章搜索、跳转和提交等业务行为由页面决定。

需要注意当前项目同时存在 ui/button 与 ui/base/button，两者接口有差异，不能只改 import 就认定可互换。`index.css` 还通过 data-slot 对按钮和输入框设置公共尺寸，所以实际外观需要结合组件类名与全局 CSS 一起看。

## 一句话总结

主题决定用什么颜色，组件封装决定控件怎么使用、有哪些通用样式和行为；如果只需要视觉一致，先做好统一主题就够了。
