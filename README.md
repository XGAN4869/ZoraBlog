# Go React Blog

当前仓库包含一个 React + TypeScript + Vite 前端，`backend` 目录暂时没有 Go 代码。

## 不使用 Docker：本地开发

前端：

```powershell
cd frontend/GanBlog
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
