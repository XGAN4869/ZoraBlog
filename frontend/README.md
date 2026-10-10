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
- `/articles/:slug`：示例文章、目录、代码复制和相关阅读。
- 其他路径：404 页面。

顶部搜索支持按钮和 Ctrl/Cmd + K。明暗主题保存在浏览器的 `zora-theme` 中，默认暗色。

## 修改入口

- `src/App.tsx`：页面与交互。
- `src/App.css`：1700px 版心、布局与响应式规则。
- `src/index.css`：明暗主题的语义化颜色变量。
- `src/components/ShapeGrid.tsx`：Canvas 网格、拖尾、高分屏绘制和动画暂停。
- `src/components/ui/`：shadcn CLI 生成的组件，可通过 `components.json` 继续添加。
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
