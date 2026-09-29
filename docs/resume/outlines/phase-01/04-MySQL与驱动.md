# 04 · MySQL 与驱动

目标：**启动一个持久化 MySQL，并让 Go 通过 `database/sql` 成功 Ping 数据库。**

## 1. 什么是数据库驱动

Go 标准库 `database/sql` 定义了统一操作方式，例如：

```go
sql.Open(...)
db.PingContext(...)
db.QueryContext(...)
```

但标准库不知道 MySQL 网络协议。`go-sql-driver/mysql` 就是翻译层：把 `database/sql` 的调用转换成 MySQL 能理解的协议。

前端类比：`database/sql` 像统一的 `fetch` 接口，MySQL 驱动像具体负责 TCP、认证和数据格式的实现。

## 2. 安装驱动

```powershell
cd backend
go get github.com/go-sql-driver/mysql@latest
go mod tidy
```

检查：

```powershell
go list -m github.com/go-sql-driver/mysql
```

`go get` 做了两件事：

- 把依赖版本记录到 `go.mod`。
- 把源码下载到 Go Module Cache，而不是复制进项目的 `backend/`。

## 3. 在 Compose 中加入 MySQL

Phase 01 使用 MySQL 8.4 系列，并固定补丁版本，避免一次重新构建意外升级数据库。

目标服务结构：

```yaml
mysql:
  image: mysql:8.4.11
  environment:
    MYSQL_DATABASE: ${MYSQL_DATABASE}
    MYSQL_USER: ${MYSQL_USER}
    MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
  command:
    - --character-set-server=utf8mb4
    - --collation-server=utf8mb4_0900_ai_ci
  ports:
    - "${MYSQL_HOST_PORT:-3307}:3306"
  volumes:
    - mysql_data:/var/lib/mysql
  healthcheck:
    test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -u root -p$$MYSQL_ROOT_PASSWORD --silent"]
    interval: 5s
    timeout: 3s
    retries: 20
    start_period: 20s
```

根级 volumes：

```yaml
volumes:
  mysql_data:
```

为什么宿主机使用 `3307`：很多电脑已有 MySQL 占用 `3306`。容器内部仍使用标准端口 `3306`。

## 4. 两种 DSN 不要混淆

本机运行 Go：

```text
blog:blog_dev_password@tcp(127.0.0.1:3307)/blog?parseTime=true&charset=utf8mb4&loc=UTC
```

Go 运行在 Compose 内部：

```text
blog:blog_dev_password@tcp(mysql:3306)/blog?parseTime=true&charset=utf8mb4&loc=UTC
```

`mysql` 是 Compose 服务名，只能在 Compose 网络内部解析。Windows 本机无法用它连接容器。

参数含义：

- `parseTime=true`：把 MySQL 时间转换为 Go `time.Time`。
- `charset=utf8mb4`：支持完整 Unicode，包括 emoji。
- `loc=UTC`：数据库连接统一使用 UTC。

## 5. 创建数据库连接函数

目标文件：

```text
backend/internal/database/mysql.go
```

建议接口：

```go
func OpenMySQL(ctx context.Context, dsn string) (*sql.DB, error)
```

最小行为：

1. 使用 `sql.Open("mysql", dsn)` 创建连接池。
2. 设置最大空闲连接、最大连接数和连接生命周期。
3. 使用带超时的 `PingContext` 验证数据库真的可达。
4. Ping 失败时关闭连接池并返回带上下文的错误。

驱动通过空白导入注册：

```go
import _ "github.com/go-sql-driver/mysql"
```

下划线表示“执行包的初始化逻辑，但当前文件不直接调用它的导出函数”。

## 6. `sql.Open` 为什么不代表连接成功

`sql.Open` 通常只验证驱动名称和准备连接池，不一定立即访问数据库。因此下面写法不够：

```go
db, err := sql.Open("mysql", dsn)
```

还必须：

```go
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

if err := db.PingContext(ctx); err != nil {
	db.Close()
	return nil, fmt.Errorf("ping mysql: %w", err)
}
```

## 7. 验证

Docker 可用时：

```powershell
docker compose up -d mysql
docker compose ps
```

MySQL 应进入 `healthy`。

然后设置本地 DSN 并运行 Go：

```powershell
$env:DATABASE_DSN = 'blog:blog_dev_password@tcp(127.0.0.1:3307)/blog?parseTime=true&charset=utf8mb4&loc=UTC'
cd backend
go run ./cmd/server
```

当前终端暂时找不到 Docker 命令时，不要伪造验收结果；先完成代码和静态检查，把容器验证保留为未完成项。

## 8. 完成检查

- [ ] MySQL 驱动已写入 `go.mod`。
- [ ] MySQL 使用 `utf8mb4` 和持久化卷。
- [ ] 本机 DSN 与容器 DSN 已分开。
- [ ] `OpenMySQL` 使用 `PingContext`。
- [ ] 连接失败会返回错误并关闭连接池。
- [ ] Docker 可用环境中 MySQL 状态为 healthy。

---

[上一篇](03-配置与结构化日志.md) · [返回目录](README.md) · [下一篇：05 · goose 数据库迁移](05-goose数据库迁移.md)
