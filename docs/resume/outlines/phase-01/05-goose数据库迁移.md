# 05 · goose 数据库迁移

目标：**学会用进入 Git 的 SQL 文件管理数据库版本，而不是手动改表。**

## 本篇先理解它在解决什么事故

假设你在本机手动执行：

```sql
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
```

你的数据库已经变化，但同事、测试服务器和生产服务器并不知道。代码一发布，某些环境有字段，某些环境没有字段，这叫 **schema drift（结构漂移）**。

Goose 把“修改数据库”变成可以进入 Git 的版本文件：

```text
开发者写 migration
  -> Git 保存顺序和内容
  -> goose 查询数据库当前版本
  -> 只执行尚未应用的 migration
  -> goose 记录新的版本
```

所以 Goose 的价值不只是自动执行 SQL，而是让所有环境能回答：“当前数据库已经执行到哪个版本？”

## 1. migration 是什么

数据库结构也需要版本历史。例如以后创建 `users` 表、给文章增加字段，都应该由一个按顺序执行的 SQL 文件描述。

migration 解决：

- 新电脑如何得到相同表结构。
- 测试环境和生产环境如何升级。
- 谁在什么时候增加了哪个字段。
- 出错时怎样回滚上一版。

Goose 是执行这些版本文件的工具，不替代 MySQL，也不替代 sqlc。

三者职责必须分开：

| 工具 | 回答的问题 |
|---|---|
| MySQL | 数据实际保存和查询在哪里 |
| goose | 数据库结构怎样从版本 A 变到版本 B |
| sqlc | 手写 SQL 如何变成类型安全 Go 方法 |

如果混淆它们，就容易认为“装了 sqlc 就会自动建表”或“goose 会替我写查询”，这两件事都不会发生。

## 2. 安装 goose

Windows 已有 Go 时：

```powershell
go install github.com/pressly/goose/v3/cmd/goose@latest
goose --version
```

逐条解释：

- `go install package@version` 编译并安装一个可执行命令。
- `@latest` 只决定这一次安装哪个版本，不会把 goose 记入项目的 `go.mod`。
- `goose --version` 验证的是 PATH 能否找到安装结果，而不只是下载是否成功。

项目运行时不需要 goose 常驻内存；它只在开发、测试或部署迁移阶段运行。

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

逐行理解：

- `-- +goose Up` 是 Goose 识别的指令，下面是升级数据库时执行的内容。
- `SELECT 1` 不改业务结构，只验证 SQL 可以连接并执行。
- `-- +goose Down` 定义撤销这一版本时执行的内容。
- 第二个 `SELECT 1` 同样不改变结构，因此这个 baseline 可以安全来回练习。

为什么不在这里创建 `users`：用户表字段属于 Phase 02 的产品决策。Phase 01 只验证迁移工具链，不能为了演示工具提前锁死业务模型。

这份空基线的局限也要清楚：它只能证明 Goose 会连接、排序和记录版本，不能证明真实建表 SQL 正确。Phase 02 的第一份业务 migration 才会覆盖字段、索引和约束。

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

命令执行链路：

1. Goose 从环境变量读取驱动、DSN 和迁移目录。
2. 使用 MySQL 驱动连接数据库。
3. 读取或创建 Goose 自己的版本表。
4. 按文件名前缀排序 migration。
5. `status` 只比较文件与数据库记录，不修改业务结构。
6. `up` 执行所有未应用的 Up，并记录版本。

第二次执行 `goose up` 不应该重复运行同一 migration。这种 **幂等的版本判断** 来自 Goose 的版本记录，不是因为所有 SQL 本身都能安全重复。

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

例如“删除一列”的 Down 可能无法恢复列中原来的数据。语法上能回滚，不代表业务数据能恢复。因此：

- 本地空数据环境可以练习 down/up。
- 生产变更前先备份。
- 破坏性变更优先使用“新增字段 → 迁移数据 → 切换代码 → 后续删除旧字段”的多阶段方式。

## 6. 为什么不在应用启动时自动迁移

不要在每次 Go 服务启动时偷偷执行建表：

- 多个实例可能同时改表。
- 迁移失败会和应用发布混在一起。
- 生产环境难以审计谁修改了数据库。

首版部署顺序固定为：

```text
备份 -> 执行 goose up -> 启动新版 Go 服务
```

为什么迁移在启动新版服务之前：新版代码可能依赖新字段。如果先启动代码再改表，请求会在中间窗口访问不存在的字段。

反过来，migration 也必须考虑旧代码仍在运行的短暂阶段。因此新增字段通常比立即删除/重命名字段安全。

## 6.1 常见错误

| 表现 | 原因 |
|---|---|
| `goose` 不是命令 | GOPATH/bin 没加入 PATH |
| `connection refused` | MySQL 未启动或 DSN 端口错误 |
| `access denied` | Goose 使用的账号密码不对 |
| migration 显示 missing | 已应用的文件被重命名或删除 |
| 重复列/表错误 | 手动改过数据库，版本记录与真实结构不一致 |
| Down 成功但数据没回来 | 回滚 SQL 只能恢复结构，无法凭空恢复已删除数据 |

## 6.2 最小练习

1. 解释为什么 migration 文件一旦被共享或部署后不应该随意改名。
2. 执行两次 `goose up`，观察第二次为什么没有重复应用。
3. 在本地练习 `down → status → up`，记录每一步版本变化。
4. 假设下一阶段要创建 users 表，先写出 Up/Down 各自应该承担什么，不急着写字段。

## 6.3 官方参考

- Goose 安装：<https://pressly.github.io/goose/installation/>
- Goose CLI 命令：<https://pressly.github.io/goose/documentation/cli-commands/>
- Goose 环境变量：<https://pressly.github.io/goose/documentation/environment-variables/>

## 7. 完成检查

- [ ] `goose --version` 有输出。
- [ ] migrations 目录和 baseline 已进入 Git。
- [ ] `goose up` 可重复执行，第二次不会重复应用。
- [ ] `goose status` 能显示当前版本。
- [ ] 本地练习过一次 down/up。
- [ ] 没有创建超出 Phase 01 的 users/articles 表。

---

[上一篇](04-MySQL与驱动.md) · [返回目录](README.md) · [下一篇：06 · sqlc 生成查询代码](06-sqlc生成查询代码.md)
