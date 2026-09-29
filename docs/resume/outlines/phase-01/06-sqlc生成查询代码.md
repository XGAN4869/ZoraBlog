# 06 · sqlc 生成查询代码

目标：**自己写 SQL，让 sqlc 生成类型安全的 Go 方法，不使用 GORM。**

## 1. sqlc 在系统里的位置

```text
migrations：数据库结构是什么
queries：程序需要执行哪些 SQL
sqlc：读取上面两类文件，生成 Go 代码
database/sql：运行生成的代码
MySQL driver：把调用翻译成 MySQL 协议
```

sqlc 不是 ORM，也不会在程序运行时分析模型。它是开发阶段的代码生成器。

## 2. 安装 sqlc

```powershell
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
sqlc version
```

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

注释不是普通说明：

- `HealthValue` 是生成的 Go 方法名。
- `:one` 表示恰好返回一行。

这个查询只验证生成链路，不提前建立用户业务。

## 5. 生成代码

```powershell
cd backend
sqlc generate
```

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

## 6. 生成文件不能手改

如果想修改方法：

1. 修改 `queries/*.sql`。
2. 运行 `sqlc generate`。
3. 重新运行 Go 测试和构建。

直接改 `dbgen` 里的 Go 文件，下次生成时会被覆盖。

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
