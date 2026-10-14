# Go React Blog

本站使用 GitHub OAuth 登录，随机 Session ID 通过 HttpOnly Cookie 传输。接入步骤、数据库兼容及代码参考见 [backend/AUTH.md](backend/AUTH.md)。

首页和文章已部署至 <https://zora-blog-react.vercel.app>。当前线上版本为静态博客，暂未启用登录；本地开发仍可连接 Go 和 MySQL。发布配置及后续认证接入见 [Vercel 部署说明](frontend/docs/vercel-deployment.md)。

## 目录结构

```text
Go_React_Blog/
├── frontend/                 # React 前端
└── backend/
    ├── main.go               # 加载配置、连接数据库、启动 HTTP 服务
    ├── config/config.go      # 数据库、Cookie、GitHub OAuth 配置
    ├── router/router.go      # 直接注册完整路由路径
    ├── handlers/auth.go      # GitHub 跳转、回调、会话恢复、退出
    ├── service/
    │   ├── auth.go           # OAuth 请求与本站随机会话
    │   └── github.go         # GitHub 授权码交换和用户 API
    ├── repository/           # GORM + MySQL 用户、会话和一次性 OAuth 请求
    │   ├── auth.go           # 数据库连接、查询和事务
    │   └── models.go         # OAuth 表模型
    ├── dto/                  # HTTP 响应和 GitHub API 数据结构
    ├── middleware/
    │   ├── auth.go           # 读取本站会话 Cookie
    │   └── security.go       # 请求来源校验和登录限流
    ├── response/response.go  # 统一 JSON 响应
    ├── notes/                # 学习笔记
    ├── AUTH.md               # 登录接入说明与代码参考
    ├── go.mod
    └── go.sum
```

## 目录作用

| 目录 | 核心职责 | 举例 |
| --- | --- | --- |
| router | 注册 URL 与处理函数 | /api/auth/github |
| handlers | HTTP 参数、Cookie 和响应 | 校验回调 state、重定向 |
| service | 登录与会话业务 | 交换 GitHub 授权码、生成随机会话 |
| repository | 数据库访问 | 查找会话、更新 GitHub 用户 |
| middleware | 请求的公共处理 | 来源校验、限流 |
| dto | 对外数据结构 | 会话响应、GitHub 用户资料 |
| config | 加载运行配置 | MySQL 和 GitHub OAuth 参数 |

## 不使用 Docker：本地开发

前端：

```powershell
cd frontend
npm install
npm run dev
```

浏览器访问 <http://localhost:5173>。Vite 会把 `/api` 请求代理到
`http://localhost:8080`。

后端代码完成后，在另一个终端运行它。入口在 `backend` 根目录时通常是：

```powershell
cd backend
go run .
```

如果以后把入口放在 `backend/cmd/server`，则使用 `go run ./cmd/server`。Go 服务需要监听
`8080` 端口，并提供 `/api/...` 路由。

## 使用 Docker

现在只有前端可运行：

```powershell
docker compose up --build -d
```

打开 <http://localhost:5173>。查看状态或停止服务：

```powershell
docker compose ps
docker compose down
```

后端有 `go.mod` 和可执行入口后，可同时构建、启动前后端：

```powershell
docker compose --profile full up --build -d
```

浏览器仍然只访问 <http://localhost:5173>。前端容器里的 Nginx 会把 `/api/...`
转发到 Compose 网络中的 `backend:8080`，因此浏览器端不需要知道后端容器地址，也不需要处理跨域。

`backend/Dockerfile` 默认从 `backend` 根目录构建。如果入口在 `cmd/server`，请在
`compose.yaml` 的后端 `build` 下增加：

```yaml
args:
  GO_BUILD_TARGET: ./cmd/server
```

## 前后端要不要“分开传”

- 源代码：小型或学习项目可以继续放在同一个 Git 仓库，一次上传即可，维护最简单。
- Docker：前端和后端应构建成两个镜像、运行在两个容器中，由一个 `compose.yaml` 统一编排。
- 部署：可以把整个仓库传到服务器后执行 Compose；更成熟的做法是让 CI 分别构建两个镜像，服务器只拉镜像。
- 对外访问：通常只公开 Nginx 的 `80/443`，后端只在 Docker 内部网络开放 `8080`。

以后若加入数据库，也应作为独立服务，并把数据放在命名卷中；不要打包进前端或后端镜像。
