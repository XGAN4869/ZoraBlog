# Go React Blog CMS 需求清单

> 更新日期：2026-09-29  
> 设计规格：[2026-09-29-blog-cms-design.md](../specs/2026-09-29-blog-cms-design.md)  
> 开发路线：[2026-09-29-blog-cms-roadmap.md](../plans/2026-09-29-blog-cms-roadmap.md)  
> 当前原则：只展开 Phase 01，不一次性生成 Phase 02～06 的详细教程和代码。

## 1. 这个项目最终要做什么

这是一个个人技术博客 CMS：

- 管理员通过后台编写 Markdown 文章。
- 管理员可以保存草稿、发布、下架和删除文章。
- 匿名访客可以阅读已发布文章。
- GitHub 登录用户可以发表评论和管理自己的评论。
- 首版使用 React + Vite、Go + Gin、MySQL、sqlc 和 Docker Compose。
- 未来只把公开博客迁移到 Next.js，Go API、MySQL 和 Vite 管理后台保留。

## 2. 勾选规则

- `[x]`：当前仓库中已经存在，并在本次检查中得到证据。
- `[ ]`：尚未完成、只有占位配置，或者当前环境无法验证。
- “代码存在”不等于“自动化测试通过”；两者分开记录。

## 3. 当前已经完成的基础

### 3.1 开发环境

- [x] 已安装 Go，当前检测为 `go1.27.1 windows/amd64`。
- [x] 已安装 Node.js，当前检测为 `v24.15.0`。
- [x] 已安装 npm，当前检测为 `11.12.1`。
- [ ] 当前终端可以使用 Docker CLI。本次检查中 `docker` 命令不可用。
- [ ] 已安装 sqlc。本次检查结果为 `NOT_INSTALLED`。
- [ ] 已安装 goose。本次检查结果为 `NOT_INSTALLED`。

### 3.2 React 前端

- [x] `frontend/` 目录已经存在，React + TypeScript + Vite 工程文件完整。
- [x] Vite 已配置 `/api` 转发到 `http://localhost:8080`。
- [x] Nginx 已配置 `/api/` 转发到 `backend:8080`。
- [x] Nginx 已配置 SPA 路由回退和静态资源缓存。
- [x] `npm run build` 已在 2026-09-29 执行通过。
- [x] `npm run lint` 已在 2026-09-29 执行通过。
- [ ] `package.json` 和 `package-lock.json` 的项目名已从 `fronted` 改成 `frontend`。
- [ ] 已建立前端测试命令和测试文件。本次未发现 `*.test.*` 或 `*.spec.*`。

### 3.3 Go 后端

- [x] `backend/go.mod` 和 `backend/go.sum` 已存在。
- [x] 已安装 Gin，并能编译现有代码。
- [x] `backend/main.go` 已提供最小 `GET /api/health` 路由。
- [x] 已有一份内存用户存储的学习代码，包括 `User`、`userStore` 和 `CreateUser`。
- [x] `go test ./...` 已执行成功，但输出明确显示 `[no test files]`。
- [x] `go build ./...` 已执行成功。
- [ ] 已有真正的 Go 自动化测试文件。
- [ ] Go 入口已迁移到 `backend/cmd/server/`。
- [ ] 已建立 `internal/config`、`internal/httpx`、`internal/database` 等模块边界。
- [ ] 已实现统一 JSON 错误格式。
- [ ] 已实现结构化日志和优雅关闭。

### 3.4 Docker 与仓库结构

- [x] 前端 Dockerfile、后端 Dockerfile、Nginx 配置和根目录 Compose 文件已存在。
- [x] 工作区已经从 `fronted/` 复制/移动到 `frontend/`。
- [ ] Git 已把本次目录变化识别为最终重命名，而不是“旧目录删除 + 新目录未跟踪”。
- [ ] `compose.yaml` 的前端构建路径已改成 `./frontend`，当前仍是 `./fronted`。
- [ ] 根目录 README 的前端路径已改成 `frontend/`，当前仍引用旧路径。
- [ ] 后端 Docker 构建目标已改成 `./cmd/server`，当前默认仍是根目录 `.`。
- [ ] `docker compose config` 已验证。本次因 Docker CLI 不可用，无法执行。
- [ ] 前端、后端和 MySQL 可以通过一条 Compose 命令共同启动。

## 4. Phase 01：工程与数据基础需求

### 4.1 保护现有学习成果

- [ ] 保留 `backend/main.go` 当前未提交修改中的有效注释和内存用户示例。
- [ ] 保留 `backend/notes/knowledge.md` 当前未提交内容。
- [ ] 在重构入口前，为旧的内存用户代码安排明确的学习示例位置，禁止直接删除。
- [ ] 修正 `frontend` 重命名涉及的所有仓库引用。

### 4.2 最小 Gin 服务与分层入口

- [ ] 创建 `backend/cmd/server/main.go` 作为唯一 HTTP 服务入口。
- [ ] 创建负责组装路由的 server/router 模块。
- [ ] 保留兼容入口 `GET /api/health`。
- [ ] 区分“进程存活”和“MySQL 可用”两种健康状态。
- [ ] 服务启动失败时返回明确错误，不静默忽略 `router.Run` 或数据库连接错误。

### 4.3 配置与日志

- [ ] 使用环境变量加载端口、运行环境和 MySQL DSN。
- [ ] 提供不包含真实密钥的 `.env.example`。
- [ ] 配置缺失或格式错误时提供可理解的启动错误。
- [ ] 使用 Go 标准库 `log/slog` 输出结构化日志。
- [ ] 日志不得输出数据库密码或完整 DSN。

### 4.4 MySQL 驱动与连接

- [ ] 安装 `github.com/go-sql-driver/mysql`。
- [ ] 使用 `database/sql` 打开连接池，不引入 GORM。
- [ ] 设置合理的连接池参数和连接超时。
- [ ] 启动阶段执行 `PingContext` 验证数据库连接。
- [ ] 应用退出时关闭数据库连接。

### 4.5 MySQL Compose 服务

- [ ] Compose 使用 MySQL 8.4 系列镜像。
- [ ] 数据库使用 `utf8mb4`。
- [ ] 数据保存到独立命名卷。
- [ ] MySQL 提供健康检查，后端等待数据库健康后启动。
- [ ] 本地开发和容器内部使用各自正确的数据库地址。
- [ ] 数据库账号和密码通过环境变量注入，不写死到 Go 源码。

### 4.6 数据库迁移

- [ ] 安装 goose CLI。
- [ ] 创建 `backend/migrations/`。
- [ ] 提供可以执行和回滚的 baseline 迁移。
- [ ] 文档解释迁移与“程序启动时自动建表”的区别。
- [ ] `goose up`、`goose status` 和一次回滚/重做流程得到验证。

### 4.7 sqlc

- [ ] 安装 sqlc CLI。
- [ ] 创建 `backend/sqlc.yaml` 和 `backend/queries/`。
- [ ] sqlc 使用 MySQL 引擎并读取 migrations schema。
- [ ] 至少用一个最小查询验证 Go 代码生成。
- [ ] 生成代码放在 `internal/database/dbgen`，业务代码不手写重复扫描逻辑。
- [ ] 清理当前未使用的 JWT、bcrypt 和 MongoDB 依赖时，先确认没有代码引用，再执行 `go mod tidy`。

### 4.8 测试与验证

- [ ] 配置加载拥有正常和失败用例测试。
- [ ] 健康检查拥有“数据库正常”和“数据库失败”测试。
- [ ] 前端建立 Vitest 基础测试命令和一个最小烟雾测试。
- [ ] `go test ./...` 有真实测试被执行，不再只有 `[no test files]`。
- [ ] `go build ./...` 通过。
- [ ] `npm run test`、`npm run build`、`npm run lint` 通过。
- [ ] `docker compose up --build -d` 启动完整 Phase 01 拓扑。
- [ ] `/api/health` 返回 200，并能确认数据库状态。

## 5. 后续阶段需求概览

这些内容已经确定，但本轮不展开为实现教程：

- [ ] Phase 02：本地管理员账号、Session Cookie、CSRF 和后台登录。
- [ ] Phase 03：Markdown 文章、草稿、发布、下架、多分类和多标签。
- [ ] Phase 04：公开文章列表、详情、分类、标签、代码高亮和目录。
- [ ] Phase 05：GitHub OAuth、评论、一层回复和后台评论管理。
- [ ] Phase 06：媒体上传、Nginx 静态服务、生产部署和备份恢复。
- [ ] Future：将公开博客迁移到 Next.js，Vite 只保留 `/admin`。

## 6. 当前已知差异与风险

1. `frontend/` 已存在，但 README、Compose 和 npm 包名仍保留 `fronted`。
2. Git 当前把目录调整显示为旧文件删除和新目录未跟踪；实施前需要谨慎确认重命名，不执行破坏性还原。
3. `backend/main.go` 与学习笔记存在未提交修改，重构时必须逐段迁移。
4. `go.mod` 当前包含 JWT、bcrypt 和 MongoDB 驱动，但新规格 Phase 01 使用 MySQL、Session 和 sqlc。
5. Docker CLI 在当前终端不可用，Compose 验收必须在 Docker 可用后补做。
6. Go 和 React 当前都没有自动化测试文件，不能把“能够构建”当成“已有测试保障”。

## 7. 下一步

本轮只继续阅读并确认下面这份 Phase 01 学习提纲：

[Phase 01 · 工程与数据基础](../outlines/phase-01/README.md)

学习文档已经按单元拆分。每篇都需要独立完成并验证，不能因为后续文件已经存在就跳过当前单元。
