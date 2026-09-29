# Go React Blog CMS Roadmap

> **For agentic workers:** 每次只为当前阶段生成独立实施计划。实施阶段计划时必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，并逐任务执行测试与验证。

**Goal:** 分六个可独立验证的阶段，将当前 React + Go 起步仓库建设为可上线的个人博客 CMS。

**Architecture:** 首版由单个 React + Vite 应用承载公开博客和 `/admin`，Go + Gin 模块化单体提供 `/api/v1`，MySQL 使用显式 SQL、sqlc 和版本化迁移。系统部署在单台 VPS 的 Docker Compose 中；未来只把公开前台迁移到 Next.js。

**Tech Stack:** React、TypeScript、Vite、Tailwind CSS、shadcn/ui、Gin、MySQL、sqlc、Docker Compose、Nginx、Vitest、Playwright。

**Spec:** `docs/resume/specs/2026-09-29-blog-cms-design.md`

## 1. 使用方法

本文档是阶段导航，不是可以直接实施的逐文件计划。

进入某个阶段时：

1. 阅读设计规格和本文档。
2. 检查当前 Git 状态、真实目录、依赖和测试。
3. 确认前置阶段已经 `VERIFIED`。
4. 只为当前阶段生成详细实施计划。
5. 审阅并确认阶段计划后再实施。
6. 执行阶段验收命令并读取输出。
7. 只有全部验收通过，才更新本文档的阶段状态。

状态定义：

| 状态 | 含义 |
|---|---|
| `NOT_STARTED` | 尚未生成或执行阶段详细计划 |
| `IN_PROGRESS` | 阶段计划已确认，正在实施 |
| `VERIFIED` | 功能与阶段验收命令全部通过 |
| `BLOCKED` | 存在无法在当前范围解决的外部阻塞，并已记录原因 |

## 2. 全局约束

- 新设计规格优先于 `docs/01-环境准备.md` 至 `docs/07-下一步-博客路线.md` 的早期 JWT/GORM 教程。
- 保留 `backend/main.go` 和 `backend/notes/knowledge.md` 中现有未提交改动，不得直接覆盖。
- 所有 HTTP 业务接口使用 `/api/v1`。
- 后端使用 Session Cookie 和 sqlc，不切回 JWT 或 GORM。
- 每次只实施一个阶段，不提前夹带后续功能。
- 每个阶段使用测试驱动方式：失败测试、最小实现、通过验证。
- 未读取真实命令输出前不得声称完成。
- 不在代码、文档、测试输出或提交中写入真实密钥。

## 3. 阶段总览

| 阶段 | 名称 | 状态 | 前置 | 详细计划 | 完成日期 | 偏差说明 |
|---|---|---|---|---|---|---|
| 01 | 工程与数据基础 | `NOT_STARTED` | 无 | 尚未生成 | — | — |
| 02 | 管理员认证 | `NOT_STARTED` | Phase 01 | 尚未生成 | — | — |
| 03 | 文章 CMS | `NOT_STARTED` | Phase 02 | 尚未生成 | — | — |
| 04 | 公开博客 | `NOT_STARTED` | Phase 03 | 尚未生成 | — | — |
| 05 | GitHub 登录与评论 | `NOT_STARTED` | Phase 04 | 尚未生成 | — | — |
| 06 | 媒体与生产部署 | `NOT_STARTED` | Phase 05 | 尚未生成 | — | — |

阶段状态更新规则：

- 生成并批准详细计划后，将状态改为 `IN_PROGRESS` 并添加相对链接。
- 验收全部通过后改为 `VERIFIED`，填写完成日期与实际偏差。
- 只有前置阶段为 `VERIFIED` 才能开始下一阶段。
- `BLOCKED` 必须写明阻塞条件、已经尝试的方案和解除条件。

## 4. Phase 01：工程与数据基础

**学习文档：** [Phase 01 · 工程与数据基础](../outlines/phase-01/README.md)

### 目标与用户价值

建立后续业务可以安全生长的工程、数据库和本地运行基础，让开发者能够用一条 Compose 命令启动前端、Go 和 MySQL。

### 前置阶段

无。

### 包含

- 保护并迁移当前未提交的 Go 学习代码和笔记。
- 将 `fronted/` 更名为 `frontend/`，同步修正 Compose、README 和相关路径。
- 将 Go 入口移动到 `backend/cmd/server/`，建立 `internal` 模块骨架。
- 配置加载、结构化日志、统一错误响应和 `/api/health`。
- Compose 加入 MySQL、健康检查和持久化卷。
- 引入迁移工具、sqlc 配置、测试数据库约定。
- 建立 Go 与前端基础测试命令。

### 排除

- 用户表和登录。
- 文章、评论和媒体业务。
- Tailwind 与完整页面设计。

### 必须交付

- 可启动的前端、Go 和 MySQL 服务。
- 可重复执行的数据库迁移命令。
- 可运行的 sqlc 生成命令。
- 健康检查能够区分 HTTP 服务存活和数据库可用性。

### 阶段验收目标

```text
go test ./...
npm run build
docker compose up --build -d
docker compose ps
GET /api/health -> 200
```

详细计划生成时必须根据实际引入的脚本补全精确命令和期望输出。

## 5. Phase 02：管理员认证

### 目标与用户价值

让唯一管理员能够安全登录后台、保持会话和退出，为后续内容管理建立可信身份。

### 前置阶段

Phase 01 必须为 `VERIFIED`。

### 包含

- `users`、`sessions` 迁移与 sqlc 查询。
- `cmd/admin` 管理员初始化 CLI。
- bcrypt 密码校验。
- 登录、退出、当前用户和 CSRF 接口。
- Session Cookie、撤销、过期处理和管理员中间件。
- Origin 校验、CSRF 校验和登录限流。
- `/admin/login`、会话恢复和后台路由守卫。

### 排除

- 公开用户注册。
- GitHub OAuth。
- 多管理员界面和角色管理界面。

### 必须交付的接口与页面

```text
POST /api/v1/auth/admin/login
GET  /api/v1/auth/me
GET  /api/v1/auth/csrf
POST /api/v1/auth/logout

/admin/login
/admin
```

### 完成标准

- CLI 可以创建唯一管理员。
- 正确密码登录成功，错误密码不泄露账号存在性。
- 刷新浏览器后会话仍有效。
- 退出后旧 Cookie 不能继续访问管理员测试接口。
- 缺少 CSRF、Origin 非法、会话过期和普通用户访问均被拒绝。

## 6. Phase 03：文章 CMS

### 目标与用户价值

让管理员在后台完成文章从草稿到发布、下架的完整内容管理流程。

### 前置阶段

Phase 02 必须为 `VERIFIED`。

### 包含

- 文章、分类、标签及两个多对多关联表。
- 管理员文章 CRUD、分页和软删除。
- 多分类、多标签、slug 校验和唯一冲突。
- `DRAFT / PUBLISHED / UNPUBLISHED` 状态转换。
- `version` 乐观并发控制。
- 后台文章列表、分类标签管理、Markdown 编辑与预览。
- 未保存离开提示。

### 排除

- 图片上传；首阶段编辑器允许手动填写图片 URL。
- 自动保存、定时发布和文章历史版本。
- 公开文章页面。

### 必须交付的接口与页面

```text
GET/POST   /api/v1/admin/articles
GET/PATCH  /api/v1/admin/articles/:id
POST       /api/v1/admin/articles/:id/publish
POST       /api/v1/admin/articles/:id/unpublish
DELETE     /api/v1/admin/articles/:id

GET/POST     /api/v1/admin/categories
PATCH/DELETE /api/v1/admin/categories/:id
GET/POST     /api/v1/admin/tags
PATCH/DELETE /api/v1/admin/tags/:id

/admin/articles
/admin/articles/new
/admin/articles/:id/edit
/admin/categories
/admin/tags
```

### 完成标准

- 管理员能完成“新建草稿→编辑→发布→下架”。
- 发布时缺少分类、正文或 slug 会被拒绝。
- 重复 slug 与旧版本覆盖返回 `409`。
- 普通用户和匿名请求不能调用管理员接口。

## 7. Phase 04：公开博客

### 目标与用户价值

让匿名访客能够浏览和阅读已发布文章，同时保证非公开内容不会泄露。

### 前置阶段

Phase 03 必须为 `VERIFIED`。

### 包含

- 公开文章分页、详情、分类和标签接口。
- 首页、文章列表、详情、分类页和标签页。
- Markdown、GFM、代码高亮、标题锚点和文章目录。
- 空状态、加载状态、404 和通用错误界面。

### 排除

- 全文搜索。
- 评论提交和 GitHub 登录。
- Next.js、SSR 和 ISR。

### 必须交付的接口与页面

```text
GET /api/v1/articles
GET /api/v1/articles/:slug
GET /api/v1/categories
GET /api/v1/tags

/
/articles
/articles/:slug
/categories/:slug
/tags/:slug
```

### 完成标准

- 匿名访客可以分页和按分类、标签阅读文章。
- 草稿、下架和软删除文章在列表中不可见，详情返回 `404`。
- 公开页面不能访问管理功能。
- Markdown 中的原始 HTML 不会执行。

## 8. Phase 05：GitHub 登录与评论

### 目标与用户价值

让真实 GitHub 用户参与文章讨论，同时保持评论归属、权限和管理能力清晰。

### 前置阶段

Phase 04 必须为 `VERIFIED`。

### 包含

- `oauth_accounts`、`comments` 迁移与查询。
- GitHub OAuth state、回调和用户映射。
- 顶层评论和一层回复。
- 评论作者编辑、删除自己的评论。
- 管理员隐藏和恢复任意评论。
- 评论限流和文章状态校验。
- 文章详情评论区和后台评论管理页。

### 排除

- 匿名评论。
- 无限层回复。
- 评论审核后发布、邮件通知和敏感词系统。

### 必须交付的接口与页面

```text
GET  /api/v1/auth/github/start
GET  /api/v1/auth/github/callback
GET  /api/v1/articles/:slug/comments
POST /api/v1/articles/:slug/comments
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id
GET   /api/v1/admin/comments
PATCH /api/v1/admin/comments/:id/visibility

/articles/:slug 评论区
/admin/comments
```

### 完成标准

- GitHub 用户首次登录自动建立站内账号，再次登录复用同一账号。
- 用户能编辑和删除自己的评论，不能操作他人评论。
- 管理员能隐藏和恢复任何评论。
- 回复始终归入一个顶层评论，数据库不会形成多层树。
- 下架文章不能继续接收评论。

## 9. Phase 06：媒体与生产部署

### 目标与用户价值

补齐文章图片和生产运行能力，使系统能够在单台 VPS 上稳定发布、备份和恢复。

### 前置阶段

Phase 05 必须为 `VERIFIED`。

### 包含

- `media` 迁移和图片上传接口。
- 5 MB 限制、真实 MIME 检测、随机文件名和临时文件清理。
- JPEG、PNG、WebP、GIF；拒绝 SVG。
- Markdown 编辑器上传并插入图片语法。
- Nginx `/uploads/` 只读服务。
- 生产 Compose、HTTPS、环境变量和密钥说明。
- MySQL 与上传卷的备份、恢复和验证流程。
- 全量测试、构建、容器和健康检查。

### 排除

- S3、R2、OSS 等对象存储。
- CDN 图片处理和多尺寸缩略图服务。
- 多实例部署。

### 必须交付的接口与部署行为

```text
POST /api/v1/admin/media
GET  /uploads/<storage-key>
```

### 完成标准

- 合法图片上传后可在公开文章中访问。
- 超大、伪装格式和 SVG 文件被拒绝且不留下临时文件。
- `docker compose up --build -d` 能启动完整生产拓扑。
- 数据库与媒体备份能够在空环境中恢复并通过健康检查。
- Go、React、Playwright 和生产构建全部通过。

## 10. Future：Next.js 公开前台

该阶段不属于首版，也不生成首版实施计划。

未来迁移目标：

```text
/admin --> Vite
/api   --> Go
/      --> Next.js
```

迁移时复用公开 API、Tailwind Token、shadcn 组件和 Markdown 规则。Go 在文章发布、下架和删除后调用带签名的 Next.js 重验证入口；Vite 管理后台、MySQL 和业务规则保持不变。

## 11. 阶段计划文件规范

每次只生成当前阶段文件：

```text
docs/resume/plans/YYYY-MM-DD-blog-cms-phase-XX-<name>.md
```

阶段计划必须使用以下头部：

```markdown
# Blog CMS Phase XX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当前阶段的一句话交付目标

**Architecture:** 当前阶段涉及的模块、数据流和边界

**Tech Stack:** 当前阶段实际使用的技术

**Spec:** `docs/resume/specs/2026-09-29-blog-cms-design.md`

**Roadmap:** `docs/resume/plans/2026-09-29-blog-cms-roadmap.md`
```

每个任务必须包含：

- 精确的创建、修改、测试文件路径。
- 消费和产出的接口签名。
- 先写失败测试并运行的步骤。
- 最小实现步骤。
- 完整验证命令和期望结果。
- 独立提交建议。

阶段计划生成前必须重新检查当前代码，不能从本文档猜测文件已经存在。

## 12. 可复用阶段计划生成提示词

```text
请读取：
1. docs/resume/specs/2026-09-29-blog-cms-design.md
2. docs/resume/plans/2026-09-29-blog-cms-roadmap.md

检查当前仓库和 Git 状态，只为 Phase XX 生成详细实施计划。
计划保存到 docs/resume/plans/YYYY-MM-DD-blog-cms-phase-XX-<name>.md。

要求：
- 继承设计规格中的全部约束；
- 确认上一阶段状态为 VERIFIED；
- 根据当前真实代码写明创建、修改和测试文件；
- 每个任务包含接口、失败测试、验证命令和提交建议；
- 不实现代码，不规划后续阶段；
- 不覆盖未提交的用户改动；
- 最后检查规格覆盖、类型一致性和验收场景。
```

## 13. Roadmap 更新检查表

阶段完成时逐项确认：

- [ ] 详细计划中的任务全部完成。
- [ ] 阶段要求的测试均已实际运行且通过。
- [ ] 构建或容器验证均已实际运行且通过。
- [ ] 没有提前实现后续阶段功能。
- [ ] 未提交用户改动得到保留。
- [ ] 实际接口和规格一致，或偏差已记录并得到确认。
- [ ] 阶段状态已更新为 `VERIFIED`。
- [ ] 已填写完成日期、详细计划链接和偏差说明。

## 14. 高风险复核点

每份阶段计划都要检查以下风险是否由测试覆盖：

1. Session、CSRF 或角色校验缺失导致越权写入。
2. 文章状态、软删除或公开查询条件错误导致草稿泄露。
3. 多分类、多标签事务部分成功导致关联数据不一致。
4. 评论所有权或回复归一规则错误导致越权与多层树。
5. 上传文件真实类型、路径或清理处理不当导致安全和磁盘问题。
