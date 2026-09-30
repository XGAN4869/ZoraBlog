# 06 · sqlc 生成查询代码

目标：**自己写 SQL，让 sqlc 生成类型安全的 Go 方法，不使用 GORM。**

## 本篇先回答：为什么已经有 `database/sql` 还需要 sqlc

只使用 `database/sql` 时，你通常要手写：

```text
SQL 字符串
  -> QueryContext
  -> rows.Next
  -> rows.Scan(&a, &b, &c)
  -> 自己保证字段顺序和 Go 类型一致
```

SQL 改了一个字段，`Scan` 忘记同步，问题往往运行到该接口才出现。sqlc 把这部分机械工作提前到生成阶段：

```text
schema + query
  -> sqlc 静态分析
  -> 生成参数类型、返回类型和查询方法
  -> Go 编译器继续检查调用方
```

你仍然需要理解和编写 SQL。sqlc 的目的不是隐藏 SQL，而是把 SQL 与 Go 类型之间的重复翻译交给工具。

## 1. sqlc 在系统里的位置

```text
migrations：数据库结构是什么
queries：程序需要执行哪些 SQL
sqlc：读取上面两类文件，生成 Go 代码
database/sql：运行生成的代码
MySQL driver：把调用翻译成 MySQL 协议
```

sqlc 不是 ORM，也不会在程序运行时分析模型。它是开发阶段的代码生成器。

### 为什么本项目不用 GORM

本项目的学习目标包含 SQL、索引、事务和数据库约束。如果 ORM 自动生成大部分 SQL，初学阶段容易只会调用方法，却不知道数据库实际执行了什么。

sqlc 的取舍是：

- 优点：SQL 明确、生成代码可读、运行时没有反射式 ORM 层。
- 代价：每个查询仍要自己写，修改 schema 后必须重新生成。

它不是所有项目的唯一答案，只是符合这个项目的学习目标。

## 2. 安装 sqlc

```powershell
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
sqlc version
```

这里使用 `go install`，因为 sqlc 是开发工具，不是博客服务运行时 import 的包。部署后的 Go 二进制不需要携带 sqlc；只有修改 SQL 或验证生成结果的环境需要它。

如果命令找不到，同样检查 `go env GOPATH` 对应的 `bin` 是否在 PATH。

## 3. 创建配置

创建：

```text
backend/sqlc.yaml
```

配置目标：

```yaml
version: "2"
sql:
  - engine: "mysql"
    schema: "migrations"
    queries: "queries"
    gen:
      go:
        package: "dbgen"
        out: "internal/database/dbgen"
```

配置读取过程：

1. `version: "2"` 指 sqlc 配置文件格式版本，不是 MySQL 或 sqlc 软件版本。
2. `engine: "mysql"` 决定占位符、字段类型和语法解析规则。
3. `schema` 让 sqlc 知道表和列的定义；没有 schema，它无法判断查询返回什么类型。
4. `queries` 是手写 SQL 的输入目录。
5. `package: dbgen` 决定生成文件中的 `package` 声明。
6. `out` 决定生成代码落在哪里。

为什么生成代码放到 `internal`：它只服务当前后端，不应该被仓库外部的 Go 模块当成公共 SDK 导入。

含义：

- `engine`：SQL 方言是 MySQL。
- `schema`：从迁移文件理解数据库结构。
- `queries`：读取手写查询。
- `package`：生成的 Go package 名称。
- `out`：生成文件位置。

## 4. 写第一个最小查询

创建：

```text
backend/queries/health.sql
```

内容：

```sql
-- name: HealthValue :one
SELECT 1;
```

这两行会经历如下转换：

```text
-- name: HealthValue :one
        │           └─ 返回一行
        └─ Go 方法名

SELECT 1;
   └─ MySQL 返回一个常量值
```

sqlc 会根据查询结果生成一个类似 `HealthValue(ctx)` 的方法。具体整数类型由当前引擎和 sqlc 推断决定，因此应查看生成代码，不要在文档里凭印象硬写返回类型。

为什么先用 `SELECT 1`：这里验证的是“配置 → 解析 SQL → 生成 Go → 编译”的工具链，不是业务查询。用户表和文章表仍然留在对应阶段设计。

注释不是普通说明：

- `HealthValue` 是生成的 Go 方法名。
- `:one` 表示恰好返回一行。

这个查询只验证生成链路，不提前建立用户业务。

## 5. 生成代码

```powershell
cd backend
sqlc generate
```

运行时，sqlc 不连接你的生产数据库；当前配置让它读取本地 migration 和 query 文件进行静态分析。生成过程没有输出通常表示成功，有问题时会指出文件、行号和 SQL 错误。

预期生成：

```text
internal/database/dbgen/
|-- db.go
|-- models.go        # 没有表时可能非常小或不生成
`-- health.sql.go
```

具体文件数量由当前 sqlc 版本决定，不要根据教程硬猜。重点检查：

```powershell
go test ./...
go build ./...
```

为什么生成后还要 `go build`：sqlc 能理解 SQL，不代表调用包名、Go module 路径或其他手写代码一定正确。生成成功与整个应用编译成功是两道不同检查。

## 6. 生成文件不能手改

如果想修改方法：

1. 修改 `queries/*.sql`。
2. 运行 `sqlc generate`。
3. 重新运行 Go 测试和构建。

直接改 `dbgen` 里的 Go 文件，下次生成时会被覆盖。

可以把生成目录理解成前端构建产物的一部分：真正的源材料是 migration、query 和 sqlc 配置。生成文件虽然通常提交到 Git 便于构建和审查，但维护入口仍然是 SQL。

推荐验证“生成结果没有漂移”：

```powershell
sqlc generate
git status --short internal/database/dbgen
git diff -- internal/database/dbgen
```

只运行 `git diff --exit-code` 看不到尚未跟踪的新文件，所以还必须查看 `git status`。

## 7. 清理旧依赖要谨慎

当前 `go.mod` 中还有 JWT、bcrypt 和 MongoDB 驱动。新规格不使用 JWT 或 MongoDB，但不能一上来手删 `go.mod` 行。

先搜索引用：

```powershell
rg -n "golang-jwt|x/crypto|mongo-driver" backend -g "*.go"
```

确认当前编译代码不引用后，执行：

```powershell
cd backend
go mod tidy
```

让 Go 根据真实 import 自动清理依赖。

`go mod tidy` 的判断依据是当前所有可构建包和测试的 import。它不会理解“这个依赖以后可能用”，所以在删除旧示例或移动文件后运行，结果才代表当前项目真实依赖。

### 常见错误怎样理解

| 表现 | 根因 |
|---|---|
| `sqlc: command not found` | GOPATH/bin 不在 PATH |
| 找不到 schema/queries | 运行目录不对或配置路径写错 |
| SQL 语法在 sqlc 报错 | engine 方言不对，或查询本身不符合 MySQL |
| 生成后 Go import 失败 | module 路径、package 名或 out 路径不一致 |
| 修改 query 后行为没变 | 忘记重新运行 `sqlc generate` |
| 手改生成文件后改动消失 | 再次生成覆盖了手工修改 |

## 7.1 最小练习

1. 把方法名临时改为 `CheckDatabaseValue`，预测哪个生成文件会改变。
2. 把 `:one` 改成 `:many`，观察生成返回类型的变化，再恢复。
3. 故意写错 `SELEC 1`，确认错误发生在生成阶段而不是运行请求时。
4. 用自己的话解释 sqlc 和 goose 分别读取哪些文件、分别产生什么结果。

## 7.2 官方参考

- sqlc 文档：<https://docs.sqlc.dev/en/latest/>
- sqlc MySQL 入门：<https://docs.sqlc.dev/en/latest/tutorials/getting-started-mysql.html>
- Goose 与 sqlc 的配合：<https://pressly.github.io/goose/blog/2024/goose-sqlc/>

## 8. 完成检查

- [ ] `sqlc version` 有输出。
- [ ] 配置使用 MySQL 引擎。
- [ ] schema 指向 migrations，queries 指向 queries。
- [ ] `sqlc generate` 无错误。
- [ ] 生成代码没有被手改。
- [ ] 生成后 `go test ./...` 和 `go build ./...` 通过。
- [ ] 未提前生成用户或文章业务查询。

---

[上一篇](05-goose数据库迁移.md) · [返回目录](README.md) · [下一篇：07 · 健康检查](07-健康检查.md)
