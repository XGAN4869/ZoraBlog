# 09 · Compose 联调与阶段验收

目标：**用一套完整命令证明 frontend、backend 和 MySQL 能共同工作。**

这一篇不再引入新业务，负责收口 Phase 01。

## 本篇为什么放在最后

Compose 会同时放大所有错误：路径写错、环境变量缺失、数据库未迁移、后端构建目标不对、Nginx 代理失败，都可能表现成页面 502。

如果一开始就只用 `docker compose up` 调试，你很难知道问题在哪一层。因此顺序必须是：

```text
单元测试
  -> 本地构建
  -> 数据库迁移和 sqlc 生成
  -> 单服务验证
  -> Compose 整体启动
  -> 经 Nginx 验证真实访问路径
  -> 主动制造 MySQL 故障
```

越靠前的检查越快、定位越精确。Compose 是最终集成证明，不是替代所有局部验证的万能命令。

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

一次浏览器请求的真实路径：

```text
浏览器请求 /api/health
  -> 宿主机 5173 端口
  -> frontend 容器中的 Nginx
  -> Nginx 根据 /api/ 规则代理
  -> Compose DNS 把 backend 解析为后端容器 IP
  -> Gin health Handler
  -> *sql.DB Ping mysql:3306
  -> 响应沿原路径返回浏览器
```

因此直接访问 `localhost:8080` 只能证明 Go 本身工作，不能证明最终用户会经过的 Nginx 和 Compose 网络也正确。

只有前端端口需要暴露给浏览器。MySQL 的宿主机端口只为本地 Go 开发保留，生产部署时可以去掉。

## 2. 更新后端 Docker 构建目标

入口已经移动到 `backend/cmd/server` 后，后端 Dockerfile 默认构建目标改为：

```dockerfile
ARG GO_BUILD_TARGET=./cmd/server
```

为什么需要修改：Dockerfile 中 `go build "${GO_BUILD_TARGET}"` 决定编译哪个 `main` package。入口移动后仍使用默认 `.`，Docker 会在 `backend/` 根目录寻找可执行 main；根入口删除后构建就会失败。

使用 build arg 保留了以后临时切换入口的能力，但稳定默认值必须指向正式服务。

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

`depends_on.condition: service_healthy` 解决的是“第一次启动时不要太早启动后端”。它不负责：

- MySQL 运行中断开后的自动业务恢复。
- 保证 migration 已经执行。
- 保证账号权限和数据库名正确。
- 替代 Go 的连接超时和错误处理。

所以 Compose 健康检查与应用 readiness 是两层保护，不能只留其中一个。

## 4. 环境变量

Compose 中后端使用容器内部 DSN：

```yaml
environment:
  APP_ENV: development
  PORT: "8080"
  DATABASE_DSN: ${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(mysql:3306)/${MYSQL_DATABASE}?parseTime=true&charset=utf8mb4&loc=UTC
```

不要把生产密码写进 `compose.yaml`。本地从未提交的 `.env` 读取，仓库只保存 `.env.example`。

`${MYSQL_USER}` 是 Compose 在启动前从环境或 `.env` 替换的变量；`mysql:3306` 则是容器运行后通过 Compose DNS 访问的服务地址。这两个阶段不要混淆。

如果变量未设置，`docker compose config` 能让你在真正启动前看到展开后的配置，是检查空值和路径错误的第一道门。

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

执行顺序的原因：

1. `go test` 先验证行为。
2. `go build` 验证所有包能组成程序。
3. `sqlc generate` 验证 SQL 与 schema 能生成代码。
4. 查看生成目录差异，确认仓库中的生成文件没有过期。
5. 前端依次验证行为、代码规范和生产构建。

注意：`git diff` 默认看不到未跟踪的新文件，还要补充：

```powershell
git status --short internal/database/dbgen
```

只有 diff 和 status 都干净，才能说明生成结果已经同步。

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

为什么先查 status 而不是直接假设：容器有持久化卷，上一次运行留下的数据库可能比当前代码新或旧。镜像重新构建不会自动清空 MySQL volume。

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

这不是文档上的形式要求。没有运行 Compose，就没有证据证明：

- build context 已从 `fronted` 修正为 `frontend`。
- 后端 Dockerfile 能构建 `cmd/server`。
- 服务名 `mysql` 能在网络内解析。
- Nginx 能找到 backend。
- volume 与 healthcheck 配置有效。

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

为什么验证深链：React Router 的路由只存在于浏览器。如果 Nginx 收到 `/some/deep/route` 后按文件查找，它会发现磁盘上没有这个文件并返回 404。`try_files ... /index.html` 让 React 接管路由。

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

主动制造故障比只测试成功更重要。成功请求只能证明“正常时能用”；停止 MySQL 可以证明：

- live 没有错误依赖数据库。
- ready 真的执行数据库检查。
- Nginx 能正确传递 503，而不是把它改成模糊的 502。
- MySQL 恢复后应用不必重启即可重新就绪。

### 故障定位速查

| 现象 | 优先检查 |
|---|---|
| frontend 构建找不到路径 | Compose context 是否仍为 `./fronted` |
| backend 构建提示没有 main | Docker build target 是否为 `./cmd/server` |
| `/api/*` 返回 502 | backend 是否启动、Nginx 服务名是否正确 |
| backend 不断重启 | DSN、MySQL 健康、启动错误日志 |
| ready 503、live 200 | MySQL 连接、账号、migration 状态 |
| 首页能开、刷新子路由 404 | Nginx `try_files` 配置 |
| 重建后旧数据仍存在 | 命名卷仍在，这是预期行为 |

## 9.1 最小练习

1. 画出 `/api/health/ready` 从浏览器到 MySQL 再返回的完整链路。
2. 预测把 backend DSN 的主机从 `mysql` 改成 `127.0.0.1` 后，容器里会连接到谁。
3. 只停止 backend，观察首页和 `/api/health` 分别怎样响应。
4. 解释为什么 `docker compose down` 与 `docker compose down -v` 对数据的影响不同；不要在有用数据上执行 `-v`。

## 9.2 官方参考

- Compose 启动顺序：<https://docs.docker.com/compose/how-tos/startup-order/>
- Compose 环境变量：<https://docs.docker.com/compose/how-tos/environment-variables/>
- Compose 网络：<https://docs.docker.com/compose/how-tos/networking/>

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
