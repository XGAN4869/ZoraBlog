# Hi Zora Frontend

React + TypeScript + Vite 的个人技术博客基础版本，使用 Tailwind CSS、shadcn/ui、Radix UI 与 Motion。只实现前端，不需要启动 Go 服务。

## 本地运行

在 `frontend` 目录执行：

```powershell
npm install
npm run dev
```

访问终端打印的地址。指定本次预览端口：

```powershell
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

## 页面

- `/`：网格首屏、文章分类、手记、项目索引与个人介绍。
- `/login`：邮箱与密码校验、密码显示、加载和预览成功状态。
- `/articles/:slug`：导航栏下方的左侧全高分类目录、中间正文、右侧大纲、代码复制和相关阅读。导航栏始终位于窗口顶部，侧栏右上角可折叠。
- 其他路径：404 页面。

顶部搜索支持按钮和 Ctrl/Cmd + K。明暗主题保存在浏览器的 `zora-theme` 中，默认暗色。

文章切换时，正文和右侧大纲按文章标识触发 280ms 从下往上渐入过渡，位移为 16px，顶部导航及左侧目录保持挂载。同篇文章的大纲定位不重播过渡；减少动态效果设置下立即展示内容。

## 修改入口

- `src/App.tsx`：页面与交互。
- `src/App.css`：1700px 版心、布局与响应式规则。
- `src/index.css`：明暗主题的语义化颜色变量。
- `src/components/ShapeGrid.tsx`：Canvas 网格、拖尾、高分屏绘制和动画暂停。
- `src/components/ui/`：shadcn CLI 生成的组件，可通过 `components.json` 继续添加。
- `src/components/ui/base/`：原始 Base UI Sidebar 及其基础组件；后续 CLI 使用 `base-nova`。
- `src/components/BlogNavigation.tsx`：Base UI Navigation Menu 的悬停分类与文章链接。
- `src/components/ArticleDirectory.tsx`：原始 Sidebar 分类树，支持折叠图标栏和移动端抽屉。
- `src/hooks/use-directory-motion.ts`：Motion 同步驱动侧栏宽度与正文偏移；内部分类使用 AnimatePresence 实现高度和透明度过渡，支持减少动态效果设置。
- `src/hooks/use-border-glow.ts`、`src/components/BorderGlow.css`：参考 [React Bits Border Glow](https://reactbits.dev/components/border-glow) 的鼠标方向和边缘距离，给所有文章卡片添加蓝青色边缘光；明暗主题与键盘焦点均可使用。
- `src/components/ArticleOutline.tsx`：当前文章大纲与滚动定位。
- `src/data/navigation.ts`：模块与文章分类关系。
- `src/data/articles.ts`：六篇本地示例文章，后续替换成真实内容或 Go 接口数据。
- `src/lib/theme.ts`、`src/components/theme-provider.tsx`：主题状态与持久化。

网格背景参考 [React Bits Shape Grid](https://reactbits.dev/backgrounds/shape-grid)，当前版本针对方格重新实现，并增加了 DPR、基于时间的移动、ResizeObserver 和减少动态效果支持。字体在本地打包，不依赖远程字体请求。

## 登录与后端

当前登录仅校验输入并展示预览结果，不发送请求、不验证账户、不生成 token，也不保存邮箱或密码。“保持登录”在接口接入后生效。

保留原有 Vite `/api` 代理配置，未来可接入 `http://localhost:8080` 的 Go 服务。后端代码没有被本次前端工作修改。

## 验证

```powershell
npm run build
npm run lint
npx playwright install chromium
npm test
```

交互测试自动启动或复用 `5174` 端口。先运行预览服务，再执行桌面、移动端、明暗主题截图检查：

```powershell
npm run test:visual
```

截图保存在忽略提交的 `test-results/visual/`，检查包含首页、登录页、文章页的横向溢出、首屏取景和浏览器控制台错误。
