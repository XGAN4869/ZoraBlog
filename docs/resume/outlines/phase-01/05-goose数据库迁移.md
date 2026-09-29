# 05 · goose 数据库迁移

目标：**学会用进入 Git 的 SQL 文件管理数据库版本，而不是手动改表。**

## 1. migration 是什么

数据库结构也需要版本历史。例如以后创建 `users` 表、给文章增加字段，都应该由一个按顺序执行的 SQL 文件描述。

migration 解决：

- 新电脑如何得到相同表结构。
- 测试环境和生产环境如何升级。
- 谁在什么时候增加了哪个字段。
- 出错时怎样回滚上一版。

Goose 是执行这些版本文件的工具，不替代 MySQL，也不替代 sqlc。

## 2. 安装 goose

Windows 已有 Go 时：

```powershell
go install github.com/pressly/goose/v3/cmd/goose@latest
goose --version
```

如果安装成功但命令找不到，检查：

```powershell
go env GOPATH
$env:Path
```

`go install` 默认把可执行文件放在 `GOBIN`，未设置时通常是 `$(go env GOPATH)\bin`。这个目录必须加入 PATH。

`go install` 安装的是开发工具；`go get` 添加的是项目运行依赖，两者不要混淆。

## 3. 创建迁移目录

目标目录：

```text
backend/migrations/
```

Phase 01 不提前创建正式用户表，因此第一份 baseline 只验证迁移链路：

```sql
-- +goose Up
SELECT 1;

-- +goose Down
SELECT 1;
```

文件名：

```text
00001_baseline.sql
```

这是有意的空基线。Goose 自己会创建版本记录表；正式业务表从 Phase 02 开始按需求加入，不为了“看起来有表”创建无用业务模型。

## 4. 执行迁移

先启动 MySQL，再在 `backend/` 中执行：

```powershell
$env:GOOSE_DRIVER = 'mysql'
$env:GOOSE_DBSTRING = $env:DATABASE_DSN
$env:GOOSE_MIGRATION_DIR = '.\migrations'

goose status
goose up
goose status
```

预期：

- 第一次 status 显示 baseline 尚未应用。
- up 执行成功。
- 第二次 status 显示 `00001_baseline.sql` 已应用。

## 5. 练习一次回滚和重做

仅在本地学习数据库执行：

```powershell
goose down
goose status
goose up
goose status
```

生产环境不能随意执行 `down` 或 `reset`。有数据以后，很多结构变化无法安全回滚，必须为具体迁移设计策略。

## 6. 为什么不在应用启动时自动迁移

不要在每次 Go 服务启动时偷偷执行建表：

- 多个实例可能同时改表。
- 迁移失败会和应用发布混在一起。
- 生产环境难以审计谁修改了数据库。

首版部署顺序固定为：

```text
备份 -> 执行 goose up -> 启动新版 Go 服务
```

## 7. 完成检查

- [ ] `goose --version` 有输出。
- [ ] migrations 目录和 baseline 已进入 Git。
- [ ] `goose up` 可重复执行，第二次不会重复应用。
- [ ] `goose status` 能显示当前版本。
- [ ] 本地练习过一次 down/up。
- [ ] 没有创建超出 Phase 01 的 users/articles 表。

---

[上一篇](04-MySQL与驱动.md) · [返回目录](README.md) · [下一篇：06 · sqlc 生成查询代码](06-sqlc生成查询代码.md)
