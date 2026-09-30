# 04 · MySQL 与驱动

目标：**启动一个持久化 MySQL，并让 Go 通过 `database/sql` 成功 Ping 数据库。**

## 本篇先看完整连接链路

这一篇不是“装一个包、复制一个 DSN”。它要把下面五层接起来：

```text
Go 业务代码
  -> database/sql 统一接口
  -> go-sql-driver/mysql 驱动
  -> TCP 连接与 MySQL 协议
  -> Compose 中的 MySQL 服务
  -> mysql_data 持久化卷
```

每层解决不同问题：

- `database/sql` 管理连接池和统一调用方式。
- 驱动理解 MySQL 协议。
- DSN 告诉驱动连接谁、连接哪里、使用什么参数。
- Compose 创建可重复的数据库环境。
- volume 让容器删除后数据仍然存在。

少了任何一层，都不是“数据库已接入”。

## 1. 什么是数据库驱动

Go 标准库 `database/sql` 定义了统一操作方式，例如：

```go
sql.Open(...)
db.PingContext(...)
db.QueryContext(...)
```

但标准库不知道 MySQL 网络协议。`go-sql-driver/mysql` 就是翻译层：把 `database/sql` 的调用转换成 MySQL 能理解的协议。

前端类比：`database/sql` 像统一的 `fetch` 接口，MySQL 驱动像具体负责 TCP、认证和数据格式的实现。

### 为什么不是直接调用驱动函数

Go 选择让应用主要依赖 `database/sql`，驱动只负责注册自己的实现。这样连接池、事务和查询接口保持一致。未来即使换数据库，业务层理解的仍然是 `*sql.DB`、`*sql.Tx` 和 Context，而不是一套完全不同的调用方式。

这不代表切换数据库只改一行：SQL 方言和字段类型仍可能变化。统一的是运行接口，不是所有 SQL 语法。

## 2. 安装驱动

```powershell
cd backend
go get github.com/go-sql-driver/mysql@latest
go mod tidy
```

逐条解释：

- `cd backend`：`go get` 修改当前 Go module，所以必须进入有 `go.mod` 的目录。
- `go get ...@latest`：解析可用版本、下载模块并更新 `go.mod/go.sum`。
- `go mod tidy`：根据真实 import 补齐缺失依赖并移除不再使用的直接/间接依赖。

为什么不能只执行 `go install`：驱动是应用运行时依赖，必须记录在项目 `go.mod` 中。`go install` 主要用来安装命令行程序，不会把驱动接入你的应用。

检查：

```powershell
go list -m github.com/go-sql-driver/mysql
```

`go get` 做了两件事：

- 把依赖版本记录到 `go.mod`。
- 把源码下载到 Go Module Cache，而不是复制进项目的 `backend/`。

如果安装后还没有在 Go 代码里导入驱动，随后执行 `go mod tidy` 可能把它移除。依赖是否保留由真实 import 决定，不是由“我刚运行过安装命令”决定。

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

逐块理解 Compose 配置：

- `image: mysql:8.4.11`：固定运行环境。只写 `latest` 会让同一份代码在不同时间拉到不同数据库版本。
- `MYSQL_DATABASE`：第一次初始化空数据目录时创建业务数据库。
- `MYSQL_USER/MYSQL_PASSWORD`：创建给应用使用的普通账号；Go 不应该长期使用 root。
- `command`：显式指定字符集和排序规则，避免中文、emoji 或排序行为因默认值不同而变化。
- `ports`：左边是 Windows 访问端口，右边是容器内 MySQL 端口。
- `volumes`：把 `/var/lib/mysql` 放到容器外的命名卷。
- `healthcheck`：判断 MySQL 是否已经能接受连接，而不只是容器进程刚刚启动。

Healthcheck 中使用 `$$MYSQL_ROOT_PASSWORD` 而不是 `$MYSQL_ROOT_PASSWORD`，是因为 Compose 会处理 `$`。双 `$` 让变量保留到容器内部，再由容器 shell 展开。如果只写单 `$`，变量可能在 Compose 解析阶段就被替换。

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

把 DSN 拆开看：

```text
blog                    用户名
blog_dev_password       密码
tcp(...)                连接协议和地址
/blog                   数据库名
?parseTime=true...      连接参数
```

为什么统一 UTC：服务器、开发电脑和访客可能处在不同时区。数据库与 API 内部保存统一时间，展示时再转换，可以避免夏令时和部署地区变化造成的歧义。

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

为什么返回 `*sql.DB`：它并不是“一条数据库连接”，而是并发安全的连接池句柄。每个请求不应该重新 `sql.Open`；应用启动时创建一次，然后复用到各模块，退出时统一关闭。

连接池参数的意义：

- `SetMaxOpenConns`：限制同时打开的连接，避免把 MySQL 打满。
- `SetMaxIdleConns`：保留少量空闲连接，减少每个请求重新握手。
- `SetConnMaxLifetime`：定期淘汰旧连接，避免使用被服务器关闭的长期连接。

具体数值需要结合服务器资源压测；Phase 01 只设置保守的小值，不假装已经做过生产容量规划。

驱动通过空白导入注册：

```go
import _ "github.com/go-sql-driver/mysql"
```

下划线表示“执行包的初始化逻辑，但当前文件不直接调用它的导出函数”。

驱动包初始化时向 `database/sql` 注册名称 `mysql`。因此后面才能写：

```go
sql.Open("mysql", dsn)
```

如果删掉空白导入，代码仍可能编译到 `sql.Open`，但运行时会得到类似：

```text
sql: unknown driver "mysql" (forgotten import?)
```

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

逐步发生的是：

1. `WithTimeout` 创建一个最多等待 5 秒的 Context。
2. `defer cancel()` 确保定时器资源被释放。
3. `PingContext` 向连接池申请连接并真正进行网络连接和认证。
4. 失败时立即关闭池，避免返回一个不可用的 `*sql.DB`。
5. `%w` 包装底层错误，让上层可以保留原因，同时加上“发生在 ping mysql”这一层语义。

### 常见错误怎样定位

| 错误表现 | 优先检查 |
|---|---|
| `unknown driver mysql` | 是否缺少驱动空白导入 |
| `connection refused` | MySQL 是否启动、端口是否写对 |
| `access denied` | 用户名密码是否与初始化变量一致 |
| `unknown database` | `MYSQL_DATABASE` 是否只在旧 volume 初始化后才修改 |
| 本机能连、容器不能连 | 容器 DSN 是否错误使用了 `127.0.0.1` |
| 容器能连、本机不能连 | 宿主机映射端口是否为 3307 |

## 6.1 最小练习

1. 用自己的话解释为什么容器内不能使用 `127.0.0.1:3307` 连接 MySQL。
2. 暂时把 DSN 密码改错，观察错误属于网络失败还是认证失败。
3. 删除 `parseTime=true`，预测未来扫描时间字段时可能出现什么类型差异。
4. 停止 MySQL 后启动 Go，确认程序在 5 秒超时内失败，而不是永久等待。

## 6.2 官方参考

- Go `database/sql`：<https://pkg.go.dev/database/sql>
- MySQL Go 驱动：<https://pkg.go.dev/github.com/go-sql-driver/mysql>
- MySQL Docker 官方镜像：<https://hub.docker.com/_/mysql>

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
