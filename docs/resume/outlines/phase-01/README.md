# Phase 01 · 工程与数据基础

> 目标：先把 Gin、MySQL、迁移、sqlc、测试和 Compose 地基搭稳，再进入管理员用户模块。  
> 适合：第一次系统学习 Go 后端的前端开发者。  
> 需求清单：[Go React Blog CMS 需求清单](../../requirements/2026-09-29-blog-cms-requirements.md)  
> 总路线：[Go React Blog CMS Roadmap](../../plans/2026-09-29-blog-cms-roadmap.md)

## 为什么用户模块不是第一篇

当前仓库已经有一个最小 Gin 路由和一部分内存用户代码，但还缺少：

- 稳定的 Go 入口与目录边界。
- MySQL 驱动和连接池。
- 数据库迁移与 sqlc。
- 真正会执行的自动化测试。
- 可以验证的前端、后端、MySQL Compose 拓扑。

如果现在直接继续注册和登录，会把“登录业务”“数据库连接”“目录重构”“Docker 联调”四件事混在一起。Phase 01 每篇只引入一个新概念；全部验证完成后，Phase 02 再专心做管理员用户模块。

## 学习顺序

| # | 文档 | 学完得到什么 | 当前状态 |
|---|---|---|---|
| 01 | [保护现场与修正目录](01-保护现场与修正目录.md) | 正确完成 `fronted → frontend`，不丢改动 | 未执行 |
| 02 | [最小 Gin 服务与测试](02-最小Gin服务与测试.md) | 可测试的 `/api/health` 与 `cmd/server` 入口 | 未执行 |
| 03 | [配置与结构化日志](03-配置与结构化日志.md) | 环境变量配置、`.env.example`、安全日志 | 未执行 |
| 04 | [MySQL 与驱动](04-MySQL与驱动.md) | MySQL 容器、驱动、连接池和 Ping | 未执行 |
| 05 | [goose 数据库迁移](05-goose数据库迁移.md) | 可执行、查看和回滚的数据库版本 | 未执行 |
| 06 | [sqlc 生成查询代码](06-sqlc生成查询代码.md) | 从 SQL 生成类型安全 Go 方法 | 未执行 |
| 07 | [健康检查](07-健康检查.md) | 区分进程存活与数据库就绪 | 未执行 |
| 08 | [前后端最小测试](08-前后端最小测试.md) | Go 真实测试、Vitest 与前端烟雾测试 | 未执行 |
| 09 | [Compose 联调与验收](09-Compose联调与验收.md) | 一条命令启动并验证完整 Phase 01 | 未执行 |

## 学习约束

1. 严格按顺序学习；当前文档没有验证通过，不进入下一篇。
2. 每条安装命令都先理解“安装了什么、安装到哪里、如何验证”。
3. 每个代码步骤遵循：先写失败测试，再写最小实现，再运行验证。
4. 不覆盖 `backend/main.go` 和 `backend/notes/knowledge.md` 的未提交修改。
5. Phase 01 不实现登录、Session、文章和评论。
6. 旧的 `docs/01-环境准备.md` 至 `docs/07-下一步-博客路线.md` 仅作历史参考，不能把 JWT/GORM 方案带入新实现。

## 当前已经验证的基线

在拆分这些文档前，已经实际执行并看到：

```text
go version  -> go1.27.1 windows/amd64
node -v     -> v24.15.0
npm -v      -> 11.12.1
go test ./... -> 成功，但显示 [no test files]
go build ./... -> 成功
npm run build -> 成功
npm run lint  -> 成功
sqlc -> NOT_INSTALLED
goose -> NOT_INSTALLED
docker -> 当前终端找不到命令
```

这表示代码目前可以构建，但数据库、代码生成、Docker 联调和真实测试还没有完成。

---

从这里开始：[01 · 保护现场与修正目录](01-保护现场与修正目录.md)
