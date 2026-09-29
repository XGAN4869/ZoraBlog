# 09 · Compose 联调与阶段验收

目标：**用一套完整命令证明 frontend、backend 和 MySQL 能共同工作。**

这一篇不再引入新业务，负责收口 Phase 01。

## 1. 最终 Compose 拓扑

```text
Browser
  -> localhost:5173
  -> frontend/nginx
       |-- /api/* -> backend:8080
       `-- /*     -> React 静态文件

backend
  -> mysql:3306

mysql
  -> mysql_data volume
```

只有前端端口需要暴露给浏览器。MySQL 的宿主机端口只为本地 Go 开发保留，生产部署时可以去掉。

## 2. 更新后端 Docker 构建目标

入口已经移动到 `backend/cmd/server` 后，后端 Dockerfile 默认构建目标改为：

```dockerfile
ARG GO_BUILD_TARGET=./cmd/server
```

Compose 不再需要通过 profile 隐藏后端。目标是普通命令就启动完整 Phase 01：

```powershell
docker compose up --build -d
```

## 3. 后端等待 MySQL 健康

Compose 中使用：

```yaml
backend:
  depends_on:
    mysql:
      condition: service_healthy
```

这只保证启动顺序，不替代 Go 自身的 `PingContext`。即使 MySQL 启动后又断开，Go 仍必须正确报告 readiness 失败。

## 4. 环境变量

Compose 中后端使用容器内部 DSN：

```yaml
environment:
  APP_ENV: development
  PORT: "8080"
  DATABASE_DSN: ${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(mysql:3306)/${MYSQL_DATABASE}?parseTime=true&charset=utf8mb4&loc=UTC
```

不要把生产密码写进 `compose.yaml`。本地从未提交的 `.env` 读取，仓库只保存 `.env.example`。

## 5. 静态检查

Docker 启动前先跑更快的本地验证：

```powershell
cd backend
go test ./...
go build ./...
sqlc generate
git diff --exit-code -- internal/database/dbgen

cd ..\frontend
npm run test
npm run lint
npm run build
```

`git diff --exit-code` 用来确认重新生成 sqlc 后没有未提交差异，避免忘记提交生成代码。

## 6. 数据库版本验证

```powershell
cd backend
$env:GOOSE_DRIVER = 'mysql'
$env:GOOSE_DBSTRING = $env:DATABASE_DSN
$env:GOOSE_MIGRATION_DIR = '.\migrations'
goose status
```

所有 Phase 01 migration 应显示已应用。

## 7. Compose 验收

当前终端此前找不到 `docker` 命令。只有 Docker Desktop 已安装、启动且 CLI 可用后，才能执行下面步骤：

```powershell
cd C:\Project\每日练习\aiAssistCoding\Go_React_Blog

docker --version
docker compose version
docker compose config
docker compose up --build -d
docker compose ps
```

预期：

- frontend 为 healthy。
- mysql 为 healthy。
- backend 已启动并通过健康检查。

如果 Docker CLI 仍不可用，本阶段不能标记为 VERIFIED。

## 8. 通过 Nginx 验证完整链路

不要只访问后端端口。最终用户通过前端 Nginx 进入：

```powershell
curl http://localhost:5173/
curl http://localhost:5173/api/health/live
curl http://localhost:5173/api/health/ready
curl http://localhost:5173/api/health
```

预期均为 200。

再检查 SPA 深链：

```powershell
curl -I http://localhost:5173/some/deep/route
```

预期返回前端 `index.html`，不是 404。

## 9. 故障验证

停止 MySQL：

```powershell
docker compose stop mysql
```

再次请求：

```powershell
curl -i http://localhost:5173/api/health/live
curl -i http://localhost:5173/api/health/ready
```

预期：

- live 返回 200。
- ready 返回 503。

恢复：

```powershell
docker compose start mysql
docker compose ps
```

等待 MySQL healthy 后，ready 应恢复 200。

## 10. Phase 01 最终检查

- [ ] `fronted` 运行引用全部修正为 `frontend`。
- [ ] 未提交 Go 学习内容得到保留。
- [ ] Go 入口位于 `cmd/server`。
- [ ] 配置、日志和统一错误边界存在。
- [ ] MySQL 驱动、连接池和 Ping 已实现。
- [ ] goose 迁移可查看、应用和回滚。
- [ ] sqlc 可以重复生成。
- [ ] Go 与 React 存在真实测试并通过。
- [ ] frontend、backend、mysql 容器都健康。
- [ ] Nginx 首页、SPA 深链和 API 反代通过。
- [ ] MySQL 故障时 live/ready 行为正确。
- [ ] 需求清单中的 Phase 01 项目已根据证据更新。
- [ ] Roadmap Phase 01 已填写完成日期、偏差并标记 `VERIFIED`。

## 11. 验收后做什么

只有本页全部检查通过，才生成 Phase 02 管理员认证的详细学习文档。Phase 02 将学习：

- users 和 sessions 表。
- bcrypt 管理员密码。
- Session Cookie。
- CSRF 与管理员中间件。
- React `/admin/login`。

---

[上一篇](08-前后端最小测试.md) · [返回目录](README.md)
