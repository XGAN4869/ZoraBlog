# Go React Blog CMS 设计规格

> 状态：已确认（Approved）  
> 日期：2026-09-29  
> 适用范围：博客 CMS 首版及未来 Next.js 公开站迁移  
> 规格优先级：本文件是博客 CMS 的唯一架构依据；`docs/01-环境准备.md` 至 `docs/07-下一步-博客路线.md` 仅保留为早期学习记录。旧文档中的 JWT、GORM、单分类等方案与本规格冲突时，以本规格为准。

## 1. 产品目标

构建一套可以真实上线、同时适合学习 React、Go 和 MySQL 的个人技术博客系统。

首版需要形成两个完整闭环：

1. 管理员可以登录后台，使用 Markdown 创建、编辑、发布、下架和删除文章。
2. 访客可以阅读已发布文章，使用 GitHub 登录后发表评论并管理自己的评论。

项目是个人 CMS，不是多作者内容平台。文章创作权限只属于管理员，普通访客不能投稿或进入文章管理接口。

## 2. 当前仓库基线

当前仓库包含：

- `fronted/`：React + TypeScript + Vite 起始项目，目录名存在拼写错误。
- `backend/`：Go + Gin 起步代码，目前只有健康检查和内存用户存储的学习代码。
- `compose.yaml`：前端容器和暂挂 `full` profile 的后端容器。
- `backend/main.go`、`backend/notes/knowledge.md`：存在用户未提交改动，后续实施必须保留并迁移有价值内容，禁止直接覆盖。

首个实施阶段将 `fronted/` 更名为 `frontend/`。此操作只修正目录名，不改变首版仍使用 Vite 的决定。

## 3. 总体架构

首版采用模块化单体，不使用微服务：

```text
Browser
  |
  v
Nginx (HTTPS / 同域入口)
  |-- /api/*     --> Go + Gin
  |-- /uploads/* --> 媒体持久化卷
  `-- /*         --> React + Vite
                       |-- 公开博客
                       `-- /admin 管理后台

Go + Gin --> MySQL
```

核心约束：

- 所有业务接口使用 `/api/v1` 前缀。
- 浏览器只访问同一域名，Nginx 负责 API 和媒体反向代理。
- Go 是文章、用户、评论、媒体和权限的唯一业务后端。
- React 不直接依赖数据库结构，只依赖稳定的 API DTO。
- MySQL 使用显式 SQL、`database/sql`、sqlc 和版本化迁移，不使用 GORM。
- 首版一个 Vite 应用同时承载公开路由和后台路由。

## 4. 用户与权限

### 4.1 角色

| 角色 | 身份来源 | 权限 |
|---|---|---|
| `ADMIN` | 本地用户名和密码 | 管理文章、分类、标签、评论、媒体 |
| `READER` | GitHub OAuth | 阅读文章、发表回复、管理自己的评论 |
| 匿名访客 | 无会话 | 阅读已发布文章和可见评论 |

### 4.2 管理员账号

- 系统不提供管理员注册 HTTP 接口。
- 管理员使用 CLI 初始化，例如 `go run ./cmd/admin create --username <name>`。
- 密码只保存 bcrypt 哈希。
- 登录失败统一返回“用户名或密码错误”，不泄露账号是否存在。

### 4.3 GitHub 访客

- GitHub OAuth 成功后，通过 GitHub 用户 ID 查找或创建站内 `READER` 用户。
- GitHub 邮箱不是用户唯一键，也不作为公开字段。
- 公开用户信息只包含站内 ID、展示名和头像地址。

### 4.4 Session

- 登录后签发至少 32 字节随机会话令牌。
- 浏览器通过 `HttpOnly; Secure; SameSite=Lax; Path=/` Cookie 携带令牌。
- MySQL 只保存令牌的 SHA-256 摘要，不保存原始令牌。
- Session 默认有效期为 7 天；退出登录后立即撤销。
- 后端根据 Session 推导当前用户和角色，不接受前端提交的 `userId` 作为授权依据。

## 5. 内容模型与发布规则

### 5.1 文章状态

```text
DRAFT --> PUBLISHED --> UNPUBLISHED --> PUBLISHED
```

- `DRAFT`：仅管理员可见。
- `PUBLISHED`：公开列表和详情可见。
- `UNPUBLISHED`：后台保留，公开接口按不存在处理。
- 删除采用 `deleted_at` 软删除；软删除文章不出现在公开接口。
- 第一次发布时写入 `published_at`；下架后重新发布保留首次发布时间。
- 每次保存增加 `version`。更新请求必须携带当前版本；旧版本保存返回 `409`，禁止静默覆盖。

### 5.2 发布校验

发布前必须满足：

- 标题非空。
- slug 非空且全局唯一。
- Markdown 正文非空。
- 至少选择一个分类。

slug 只允许小写字母、数字和单连字符，格式为：

```text
[a-z0-9]+(?:-[a-z0-9]+)*
```

英文标题可以在前端生成建议 slug；中文标题由管理员填写稳定的英文或拼音地址。发布和下架使用独立动作接口，不允许前端通过普通文章更新接口任意写入状态。

### 5.3 Markdown

- 数据库保存 Markdown 原文，Markdown 是唯一内容源。
- 前台和后台预览共用同一种渲染规则。
- 支持 GFM 表格、任务列表、代码块、标题锚点和文章目录。
- 默认禁止执行 Markdown 中的原始 HTML。
- 首版不保存预渲染 HTML，不把 HTML 作为第二份内容源。

### 5.4 分类与标签

- 文章与分类为多对多关系。
- 文章与标签为多对多关系。
- 草稿可以没有分类；发布时至少一个分类。
- 标签允许为空。
- 分类和标签均使用唯一名称与唯一 slug。

## 6. 评论规则

- 匿名访客可以阅读评论，但不能发表评论。
- GitHub 登录用户可以发表顶层评论或回复。
- 新评论默认状态为 `VISIBLE`，提交后立即展示。
- 普通用户只能编辑、删除自己的评论。
- 管理员可以隐藏或恢复任意评论。
- 作者删除评论后状态变为 `DELETED`，公开接口返回占位信息，保留回复链。
- 管理员隐藏评论后状态变为 `HIDDEN`，公开接口不返回正文。
- 评论只支持“顶层评论 + 一层回复”。回复另一条回复时，服务端将其归到同一个顶层评论，并通过 `reply_to_user_id` 表达回复对象。
- 只有 `PUBLISHED` 文章允许新增评论。文章下架后评论数据保留，但文章和评论不再公开访问。
- 评论保存纯文本，不解析 Markdown 或 HTML。

## 7. 数据模型

### 7.1 核心表

#### `users`

- `id`
- `role`：`ADMIN` 或 `READER`
- `username`：管理员使用，可空，存在时唯一
- `password_hash`：管理员使用，可空
- `display_name`
- `avatar_url`
- `status`
- `created_at`、`updated_at`

#### `oauth_accounts`

- `id`
- `user_id`
- `provider`：首版固定为 `github`
- `provider_user_id`
- `provider_login`
- `created_at`、`updated_at`
- `(provider, provider_user_id)` 唯一

#### `sessions`

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `revoked_at`
- `created_at`、`last_seen_at`
- `token_hash` 唯一

#### `articles`

- `id`
- `author_id`
- `title`
- `slug`
- `summary`
- `content_markdown`
- `cover_media_id`
- `status`
- `version`
- `published_at`
- `created_at`、`updated_at`、`deleted_at`
- `slug` 全表唯一；软删除不释放原 URL

#### `categories` 与 `article_categories`

- 分类包含 `id`、`name`、`slug`、时间字段。
- 关联表使用 `(article_id, category_id)` 联合唯一键。

#### `tags` 与 `article_tags`

- 标签包含 `id`、`name`、`slug`、时间字段。
- 关联表使用 `(article_id, tag_id)` 联合唯一键。

#### `comments`

- `id`
- `article_id`
- `user_id`
- `parent_id`：顶层评论为空，回复指向顶层评论
- `reply_to_user_id`
- `body`
- `status`：`VISIBLE`、`HIDDEN`、`DELETED`
- `created_at`、`updated_at`

#### `media`

- `id`
- `uploader_id`
- `storage_key`
- `original_name`
- `mime_type`
- `size_bytes`
- `created_at`
- `storage_key` 唯一

### 7.2 数据一致性

- 文章与分类、标签的写入必须处于同一事务。
- 发布状态校验和状态更新必须处于同一事务。
- sqlc 查询负责持久化，不在 Handler 中直接执行 SQL。
- 数据库迁移由显式命令执行；应用启动时不得自动改表。

## 8. REST API

所有接口使用 JSON，媒体上传除外。列表分页统一使用 `page` 和 `pageSize`，响应包含：

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

日期使用 UTC ISO 8601 字符串。

### 8.1 公开读取

```text
GET /api/v1/articles
GET /api/v1/articles/:slug
GET /api/v1/categories
GET /api/v1/tags
GET /api/v1/articles/:slug/comments
```

文章列表允许按分类 slug、标签 slug 和页码筛选。首版不提供全文搜索参数。

### 8.2 认证

```text
POST /api/v1/auth/admin/login
GET  /api/v1/auth/github/start
GET  /api/v1/auth/github/callback
GET  /api/v1/auth/me
GET  /api/v1/auth/csrf
POST /api/v1/auth/logout
```

`GET /auth/csrf` 在缺少或 Token 无效时签发一个绑定当前 Session 的 CSRF Token，同时写入可由前端读取的 `Secure; SameSite=Lax` Cookie 并在响应中返回。Token 使用服务端密钥签名，不写入数据库；已有有效 Token 时原样返回，避免多个浏览器标签互相使 Token 失效。所有修改状态的请求必须同时携带 CSRF Cookie 和 `X-CSRF-Token` 请求头，服务端校验二者相等、签名有效且绑定当前 Session。

GitHub OAuth `state` 使用短期、HttpOnly Cookie 保存并在回调时校验，用后立即失效。

### 8.3 评论

```text
POST   /api/v1/articles/:slug/comments
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id
```

### 8.4 管理员文章

```text
GET    /api/v1/admin/articles
POST   /api/v1/admin/articles
GET    /api/v1/admin/articles/:id
PATCH  /api/v1/admin/articles/:id
POST   /api/v1/admin/articles/:id/publish
POST   /api/v1/admin/articles/:id/unpublish
DELETE /api/v1/admin/articles/:id
```

### 8.5 管理员分类与标签

```text
GET/POST          /api/v1/admin/categories
PATCH/DELETE      /api/v1/admin/categories/:id
GET/POST          /api/v1/admin/tags
PATCH/DELETE      /api/v1/admin/tags/:id
```

被文章使用的分类或标签默认拒绝删除并返回 `409`，不做级联删除。

### 8.6 管理员评论与媒体

```text
GET   /api/v1/admin/comments
PATCH /api/v1/admin/comments/:id/visibility
POST  /api/v1/admin/media
```

媒体上传成功返回媒体 ID、公开 URL、MIME 和大小。

### 8.7 错误格式

```json
{
  "error": {
    "code": "ARTICLE_SLUG_CONFLICT",
    "message": "文章地址已存在",
    "fields": {
      "slug": "必须唯一"
    }
  }
}
```

状态码约定：

- `400`：请求格式错误。
- `401`：没有有效会话。
- `403`：身份有效但权限不足。
- `404`：资源不存在或对当前访问者不可见。
- `409`：slug、版本或状态转换冲突。
- `422`：字段校验失败。
- `429`：触发限流。
- `500`：未预期服务器错误，不向客户端泄露内部细节。

## 9. 前端设计

### 9.1 技术基础

- React + TypeScript + Vite。
- React Router 管理路由。
- TanStack Query 管理服务器状态和缓存。
- React Hook Form + Zod 管理表单与前端校验。
- Tailwind CSS + shadcn/ui 提供样式和基础组件。
- CodeMirror 提供 Markdown 编辑。
- React Markdown + GFM 插件提供预览和公开渲染。

### 9.2 公开路由

```text
/
/articles
/articles/:slug
/categories/:slug
/tags/:slug
```

文章详情包含标题、摘要、发布时间、分类、标签、Markdown 正文、文章目录和评论。

### 9.3 管理路由

```text
/admin/login
/admin
/admin/articles
/admin/articles/new
/admin/articles/:id/edit
/admin/categories
/admin/tags
/admin/comments
```

管理路由加载时调用 `/auth/me`。未认证或不是管理员时跳转登录页；该跳转只改善体验，真正授权始终由 Go 中间件执行。

### 9.4 编辑体验

- 桌面端编辑器与预览左右分栏。
- 窄屏使用“编辑/预览”标签切换。
- 提供保存草稿、发布和下架按钮。
- 首版只手动保存，不做自动保存。
- 页面存在未保存修改时，离开前提示。
- 图片上传成功后自动插入 Markdown 图片语法。

## 10. Go 内部边界

```text
backend/
|-- cmd/server/       # HTTP 服务入口与依赖装配
|-- cmd/admin/        # 管理员初始化 CLI
|-- internal/auth/    # 登录、OAuth、Session、CSRF
|-- internal/articles/
|-- internal/taxonomy/
|-- internal/comments/
|-- internal/media/
|-- internal/httpx/   # 统一响应、中间件和错误映射
|-- internal/config/
|-- internal/database/
|-- migrations/
|-- queries/          # sqlc SQL 查询
`-- sqlc.yaml
```

每个业务模块遵循：

```text
Handler --> Service --> Repository(sqlc)
```

- Handler 只负责解析 HTTP、调用 Service 和输出响应。
- Service 负责状态转换、授权和事务边界。
- Repository 只负责持久化。
- 只在需要替换数据库或 GitHub API 的边界定义接口，不为每个结构体机械创建接口。

## 11. 安全规则

- 所有修改状态的请求同时校验 Session、CSRF 和 `Origin`。
- 管理员接口统一经过管理员角色中间件。
- 登录按 IP 和用户名限流，基准为 15 分钟内最多 5 次失败。
- 评论按用户和 IP 限流，基准为每分钟最多 5 次提交。
- 单实例首版使用进程内限流器；未来多实例部署时再迁移到共享存储。
- 日志不得记录密码、Session Token、CSRF Token 或 OAuth Secret。
- 数据库错误不得原样返回客户端。
- 查询使用参数绑定，禁止拼接用户输入。

## 12. 媒体存储

- 首版文件保存到 VPS Docker 持久化卷。
- 接受 JPEG、PNG、WebP、GIF，单文件最大 5 MB。
- 根据文件实际内容检测 MIME，不信任扩展名和请求头。
- 拒绝 SVG，避免脚本和外部资源风险。
- 文件使用随机 storage key，禁止使用原文件名作为磁盘路径。
- 上传先写临时文件，验证通过后原子移动；任何失败都清理临时文件。
- Nginx 只读提供 `/uploads/`，禁止目录列表。

## 13. 部署与备份

生产 Compose 包含：

```text
nginx
frontend
backend
mysql
```

- 仅 Nginx 暴露 80/443。
- Go 和 MySQL 只在 Compose 内部网络通信。
- MySQL 数据与上传目录使用不同持久化卷。
- 发布前先执行数据库迁移，再启动新版 Go 服务。
- 每日备份 MySQL 和上传目录，并保留可恢复验证记录。
- 健康检查至少覆盖 Nginx 首页、Go `/api/health` 和 MySQL 连接。

## 14. 未来 Next.js 迁移边界

Next.js 不属于首版。未来迁移后：

```text
/admin --> Vite
/api   --> Go
/      --> Next.js
```

- Vite 只保留管理后台。
- Next.js 服务端调用现有公开 `/api/v1`。
- MySQL、Go 模块、鉴权和评论规则不重写。
- Tailwind 设计 Token、shadcn 组件和 Markdown 渲染规则优先复用。
- 发布、下架和删除动作增加签名重验证通知，使 Next.js 清理文章列表与详情缓存。

## 15. 首版明确不包含

- 多管理员、多作者投稿和内容审核工作流。
- 自动保存、定时发布和文章历史版本。
- 全文搜索。
- 点赞、收藏、订阅和通知中心。
- 浏览量统计和运营数据看板。
- 无限层评论。
- 对象存储和多实例媒体服务。
- Next.js 公开站。

## 16. 质量与验收原则

- Go Service 使用单元测试覆盖业务规则。
- Handler 使用 HTTP 测试覆盖输入、权限和状态码。
- Repository 使用真实 MySQL 测试库进行集成测试。
- React 使用 Vitest、Testing Library 和 MSW 测试表单、路由守卫与 API 状态。
- Playwright 覆盖管理员发布闭环和访客评论闭环。
- 每个阶段必须先生成独立实施计划，按照失败测试、最小实现、完整验证的顺序执行。
- 未运行阶段验收命令前，不得把 Roadmap 状态标记为 `VERIFIED`。
