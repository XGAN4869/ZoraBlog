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
- `/login`、`/register`：兼容旧地址，跳转到首页；本站没有独立登录页面。
- `/articles/:slug`：导航栏下方的左侧全高分类目录、中间正文、右侧大纲、代码复制和相关阅读。导航栏始终位于窗口顶部，侧栏右上角可折叠。
- 其他路径：404 页面。

顶部搜索支持按钮和 Ctrl/Cmd + K。明暗主题保存在浏览器的 `zora-theme` 中，默认暗色。

文章切换时，正文和右侧大纲按文章标识触发 280ms 从下往上渐入过渡，位移为 16px，顶部导航及左侧目录保持挂载。同篇文章的大纲定位不重播过渡；减少动态效果设置下立即展示内容。

## 修改入口

- `src/App.tsx`：全局 Provider 与路由，保持现有 URL。
- `src/pages/`：首页、文章详情和 404 页面；页面专用逻辑保留在页面内。
- `src/layouts/Site.tsx`：共享页头、页脚、搜索弹窗、搜索快捷键、页面标题与滚动处理。
- `src/components/ArticleCard.tsx`：首页和相关阅读共用的文章卡片，以及详情页共用的封面。
- `src/components/IconAction.tsx`：带提示的图标按钮，用于主题切换和代码复制。
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

页头和移动菜单中的“使用 GitHub 登录”直接将浏览器带到 `/api/auth/github`，携带当前本站页面作为返回地址。后端完成 GitHub 授权后回到该页面；取消或失败通过页面上的 toast 提示，并清除地址中的 auth_error 参数。默认本站会话有效期 24 小时，界面不再提供“保持登录”表单。`AuthProvider` 通过 `/api/session` 恢复账户状态，通过 `/api/logout` 退出。浏览器凭证为后端设置的 HttpOnly Cookie，不把 GitHub token 或本站 Session ID 存入 localStorage/sessionStorage。

Vite `/api` 代理连接 `http://localhost:8080` 的 Go 服务。首次接入需要在 GitHub 创建 OAuth App 并填写后端环境变量，配置方式见 [backend/AUTH.md](../backend/AUTH.md)。若前端使用 5174，GitHub 回调和后端 PUBLIC_ORIGIN 也必须使用 5174。

## 验证

```powershell
npm run build
npm run lint
npx playwright install chromium
npm test
```

测试自动启动或复用 `5174` 端口。`tests` 中既有自定义 Markdown/Obsidian 转换、高亮适配的单元测试，也有使用真实浏览器操作的端到端测试，不把固定欢迎语和样式当作单元测试。

| 保留的验证 | 防止的问题 |
| --- | --- |
| 登录、会话恢复、退出、错误返回与移动入口 | 登录失效、回到错误页面、退出后仍显示账户 |
| 搜索、分类目录、大纲、浏览器历史、翻页边界 | 找不到文章、跳错文章、返回键失效、弹窗不关闭 |
| Markdown/Obsidian 转换、图片、原文下载 | 标题或代码被改写、链接和图片失效、下载丢失原文 |
| 高亮适配保留原文、未知语言降级、代码复制 | 代码内容损坏或无法复制 |
| 主题选择持久化 | 刷新后丢失用户偏好 |

固定的 `Hi, Zora` 文案、打字进度、动画时长和逐帧中间状态、精确坐标与尺寸、导入笔记的固定数量不做自动断言。视觉调整后按需手动看截图，不要求日常测试批量截图。

先运行预览服务，再按需生成桌面、移动端和明暗主题截图：

```powershell
npm run test:visual
```

截图保存在忽略提交的 `test-results/visual/`，用于人工查看首页、文章页的取景和布局；脚本也会报告浏览器错误。它独立于 `npm test`，不再断言首页必须有几屏、欢迎语内容或终端动画。
