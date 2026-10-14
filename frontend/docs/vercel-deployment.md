# Vercel 部署

当前上线范围为首页、Markdown 文章、目录、搜索和主题切换。内容随前端构建发布，不依赖 Go 或 MySQL。

正式地址：<https://zora-blog-react.vercel.app>。Vercel 项目为 `xgan4869s-projects/zora-blog-react`，旧 Nuxt 项目保持原样。

当前项目已连接 GitHub 仓库的 `main` 分支，Root Directory 固定为 `frontend`。推送提交后自动构建并发布；Framework Preset 为 Vite，产物目录为 `dist`。首次 CLI 发布使用的是子目录上传，连接完整仓库后必须改为上述配置，否则仓库根目录没有首页文件，会出现 Vercel `404 NOT_FOUND`。

## 项目配置

- Git 仓库：`XGAN4869/ZoraBlog`，生产分支 `main`。
- Root Directory：`frontend`。
- Framework Preset：Vite。
- Build Command：`npm run build`。
- Output Directory：`dist`。
- Node.js：24.x。

`frontend/vercel.json` 为 React Router 配置 SPA 回退，直接打开或刷新 `/articles/:slug` 也能读取正文。

日常更新提交并推送到 `main` 即可触发自动部署。

需要手动重新构建已有部署时，可使用 Vercel CLI：

```powershell
npx vercel login
npx vercel redeploy <已有部署的URL或ID> --target production --scope xgan4869s-projects
```

`.vercel` 是本地项目关联元数据，已忽略；`.vercelignore` 防止上传本地环境文件和测试产物。GitHub Secret 和数据库密码不应写进 `VITE_*` 变量，这些变量会进入浏览器代码。

## 认证开关

开发环境默认启用认证；生产环境默认关闭。关闭时隐藏桌面和手机登录入口，不请求 `/api/session`，首页和文章仍完整可用。`VITE_AUTH_ENABLED=false` 可在本地显式关闭，`VITE_AUTH_ENABLED=true` 可显式开启。

以后启用线上登录，需要先部署 Go 服务并接入可公网访问的 MySQL，为 Vercel 配置 `/api` 代理，再设置 `VITE_AUTH_ENABLED=true` 并重新构建。

Go 服务中配置 `APP_ENV=production`、`COOKIE_SECURE=true`，`PUBLIC_ORIGIN` 使用固定的线上 HTTPS 站点地址，`GITHUB_CALLBACK_URL` 使用同来源的 `/api/auth/github/callback`。GitHub OAuth App 的回调地址也需同步修改，建议为生产单独创建 OAuth App。本机 `.env` 不会自动变成线上配置。
