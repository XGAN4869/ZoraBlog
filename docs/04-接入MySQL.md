# 04 · 接入 MySQL（驱动安装）

上一节的数据存在内存里，重启就没。这一节换成真正的数据库。

**本节只改存储层**，路由和鉴权逻辑不动。改完你还是一个 `main.go`，但数据能持久化了。
（拆成多个文件是下一节的事，先别急。）

## 1. 「驱动」到底装什么

Go 自己不认识 MySQL 的通信协议。要连 MySQL，需要装**两个**包：

```powershell
cd C:\Project\每日练习\aiAssistCoding\Go_React_Blog\backend

go get gorm.io/driver/mysql@latest
go get gorm.io/gorm@latest
```

- **`gorm.io/driver/mysql`** —— 真正干活的驱动。它内部又依赖 `github.com/go-sql-driver/mysql`
  （纯 Go 写的 MySQL 协议实现），`go get` 时会自动一起装，你不用管。
- **`gorm.io/gorm`** —— ORM，架在驱动之上。

### ORM 是什么，要不要用

**不用的写法**（标准库 `database/sql`）：

```go
rows, err := db.Query("SELECT id, username FROM users WHERE username = ?", username)
// 然后手动 rows.Next() 一行行读，手动赋值给结构体字段……
```

**用 GORM 的写法**：

```go
var user User
err := db.Where("username = ?", username).First(&user).Error
```

GORM 把「SQL 行」自动映射成「Go 结构体」。**建议用**，理由：

- 少写大量重复的扫描/赋值代码
- `AutoMigrate` 能根据结构体定义自动建表和加字段，开发期省事

代价是复杂查询不如手写 SQL 直观。**这是可逆的选择**——GORM 允许你随时执行原生 SQL，
两种写法可以混着用，不用担心选错就回不了头。

## 2. 起一个 MySQL

你机器上已经装了 Docker。**这是最省事的方式**，不用去官网下安装程序、配环境变量。

在仓库根目录的 `compose.yaml` **末尾 `volumes` 之前**插入这段（注意缩进对齐到最外层两个空格）：

```yaml
  # 开发用数据库。和 backend 一样挂在 full profile 下，
  # 所以平时 `docker compose up` 仍然只起前端。
  mysql:
    profiles:
      - full
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: ganblog
      MYSQL_USER: ganblog
      MYSQL_PASSWORD: ganblogpass
    ports:
      - "3306:3306"        # 暴露到本机，这样你本地 `go run .` 也连得上
    volumes:
      - mysql-data:/var/lib/mysql    # 数据放在命名卷里，容器删了数据还在
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -u root -p$$MYSQL_ROOT_PASSWORD --silent"]
      interval: 5s
      timeout: 5s
      retries: 20
      start_period: 30s
    restart: unless-stopped
```

然后在文件**最末尾**（和 `services:` 同级）加上卷的声明：

```yaml
volumes:
  mysql-data:
```

### 这几个配置在干什么

| 配置 | 作用 |
|------|------|
| `MYSQL_DATABASE: ganblog` | 容器**首次启动时自动建库**。所以不用手动 `CREATE DATABASE` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | 自动建一个业务账号。**不要用 root 跑业务代码** |
| `volumes: mysql-data` | 数据落在 Docker 的命名卷里。`docker compose down` 不会删，`down -v` 才会 |
| `ports: 3306:3306` | 让宿主机能连。只在开发期需要，上线时应该删掉 |
| `healthcheck` | 让 backend 能等到 MySQL 真的可用再启动，不然起来就报连接失败 |

> ⚠️ `MYSQL_DATABASE` **只在第一次启动时生效**。如果你改了库名，得先 `docker compose down -v`
> 把数据卷删掉才会重新初始化——**这会清空所有数据**。

### 启动

```powershell
cd C:\Project\每日练习\aiAssistCoding\Go_React_Blog

docker compose --profile full up -d mysql
```

第一次要拉 `mysql:8.4` 镜像。你之前配过镜像源，应该能拉到；如果卡住不动，
就是 Docker Hub 又被挡了，回 `DOCKER_SETUP.md` 检查镜像加速配置。

等它变成健康状态：

```powershell
docker compose ps
```

`STATUS` 一列出现 `(healthy)` 才算好。**首次启动要初始化数据文件，大概二三十秒，属正常。**

## 3. 验证连得上

```powershell
docker compose exec mysql mysql -uganblog -pganblogpass ganblog -e "SELECT VERSION();"
```

能打印出版本号就通了。

> 老教程会让你加 `--default-authentication-plugin=mysql_native_password`，
> **别加**。MySQL 8.4 里 `mysql_native_password` 已经被停用，加了反而起不来。
> 现在 Go 驱动原生支持默认的 `caching_sha2_password`，不需要任何特殊参数。

## 4. 改代码

改动集中在三处：**模型**、**存储层**、**handler 里调用存储层的地方**。
其余（JWT 签发、鉴权中间件、路由注册）**一行都不用动**。

### ① 加依赖 import

在 `main.go` 顶部 import 里加上：

```go
import (
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"   // ← 新增
	"gorm.io/gorm"           // ← 新增
	"gorm.io/gorm/logger"    // ← 新增
)
```

> `sync` 不再需要了（并发交给数据库），删掉。**Go 对未使用的 import 会直接编译报错**，
> 这点和 JavaScript 不一样，故意的，防止留下死代码。

### ② 替换模型定义

把原来的 `User` 结构体整个换成：

```go
// User 对应数据库里的 users 表。GORM 默认把 User 映射成 users（复数）。
type User struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Username string `gorm:"size:32;uniqueIndex;not null" json:"username"`
	// bcrypt 哈希固定 60 个字符，size:100 留了余量
	Password string `gorm:"size:100;not null" json:"-"`
	Nickname string `gorm:"size:32" json:"nickname"`
	// CreatedAt / UpdatedAt 是 GORM 的约定字段名，插入和更新时会自动写入，不用手动赋值
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
```

`gorm:` 标签的含义：

| 标签 | 含义 |
|------|------|
| `primaryKey` | 主键。`uint` 类型会自增 |
| `size:32` | 建表时字段长度 `VARCHAR(32)` |
| `uniqueIndex` | 建唯一索引。**数据库层面**保证用户名不重复 |
| `not null` | 非空 |

> `uniqueIndex` 很重要：它让「用户名唯一」由**数据库**保证，而不是靠代码里先查再插——
> 后者在并发下有漏洞（两个请求可能同时查到「不存在」，然后都插入成功）。
> 数据库的唯一索引没有这个漏洞，这正是我们下面能靠 `ErrDuplicatedKey` 判断重复的原因。

### ③ 替换整个存储层

把原来的 `userStore`（含 `sync.RWMutex` 那一坨，以及 `newUserStore`）**整段删掉**，换成：

```go
// 存储层对外的错误约定，上层用 errors.Is 判断，不去关心底层是 MySQL 还是别的。
var (
	ErrUserExists   = errors.New("用户名已被占用")
	ErrUserNotFound = errors.New("用户不存在")
)

// userStore 现在只是 GORM 的一层薄封装。
// 并发不再需要自己加锁——数据库连接池自己处理。
type userStore struct {
	db *gorm.DB
}

func newUserStore(db *gorm.DB) *userStore {
	return &userStore{db: db}
}

// Create 插入新用户。用户名冲突时返回 ErrUserExists。
func (s *userStore) Create(user *User) error {
	err := s.db.Create(user).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrUserExists
	}
	// 插入成功后，GORM 会把自增 ID 和 CreatedAt/UpdatedAt 回填进 user
	return err
}

// FindByUsername 按用户名查。注意 ? 占位符——绝不能把变量直接拼进字符串，
// 那会造成 SQL 注入（用户输入 ' OR '1'='1 就能绕过校验）。
func (s *userStore) FindByUsername(username string) (*User, error) {
	var user User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, translateNotFound(err)
	}
	return &user, nil
}

// FindByID 按主键查。
func (s *userStore) FindByID(id uint) (*User, error) {
	var user User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, translateNotFound(err)
	}
	return &user, nil
}

// translateNotFound 把 GORM 的「没查到」翻译成本包的 ErrUserNotFound。
// 这样上层不用 import gorm，换 ORM 时上层代码不用改。
func translateNotFound(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrUserNotFound
	}
	return err
}
```

### ④ 改 handler 里的调用

**注册**——原来直接传用户名和哈希，现在要先组装结构体：

```go
// 原来：user, err := store.Create(req.Username, string(hashed), req.Nickname)
user := &User{
	Username: req.Username,
	Password: string(hashed),
	Nickname: req.Nickname,
}
if err := store.Create(user); err != nil {
	if errors.Is(err, ErrUserExists) {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "注册失败"})
	return
}

c.JSON(http.StatusCreated, gin.H{"data": user})
```

**登录**——查询返回的错误从 `bool` 变成了 `error`：

```go
user, err := store.FindByUsername(req.Username)
if errors.Is(err, ErrUserNotFound) {
	// 用户不存在和密码错误返回同一句话，不给攻击者探测已注册用户名的线索
	c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
	return
}
if err != nil {
	c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户失败"})
	return
}

if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
	c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
	return
}
```

**查当前用户**——同理：

```go
user, err := store.FindByID(userID)
if errors.Is(err, ErrUserNotFound) {
	c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
	return
}
if err != nil {
	c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户失败"})
	return
}

c.JSON(http.StatusOK, gin.H{"data": user})
```

### ⑤ 加连接和建表

在 `main.go` 的 `main` 函数里，`store := newUserStore()` **之前**插入：

```go
// DSN 格式：用户名:密码@tcp(地址:端口)/库名?参数
dsn := os.Getenv("DB_DSN")
if dsn == "" {
	// 默认值面向本地开发：MySQL 跑在 Docker 里，映射到了本机 3306
	dsn = "ganblog:ganblogpass@tcp(127.0.0.1:3306)/ganblog?charset=utf8mb4&parseTime=True&loc=Local"
}

db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
	// TranslateError 把驱动原始的「错误 1062」翻译成 gorm.ErrDuplicatedKey，
	// 这样上面的 Create 判断重复时不用去认 MySQL 的错误码。
	TranslateError: true,
	Logger:         logger.Default.LogMode(logger.Warn),
})
if err != nil {
	log.Fatalf("连接 MySQL 失败：%v", err)
}

// 连接池：不限制的话高并发时会耗光数据库的连接数
sqlDB, err := db.DB()
if err != nil {
	log.Fatalf("获取连接池失败：%v", err)
}
sqlDB.SetMaxOpenConns(25)
sqlDB.SetMaxIdleConns(5)
sqlDB.SetConnMaxLifetime(time.Hour)

// 根据结构体定义自动建表（表不存在就建，缺字段就加）
if err := db.AutoMigrate(&User{}); err != nil {
	log.Fatalf("建表失败：%v", err)
}
log.Println("数据库连接成功，表结构已同步")

store := newUserStore(db)   // ← 把 db 传进去
```

### DSN 里的参数

```
ganblog:ganblogpass@tcp(127.0.0.1:3306)/ganblog?charset=utf8mb4&parseTime=True&loc=Local
└─用户名─┘└──密码──┘ └─协议─┘└──地址──┘ └─库名─┘└────────────参数────────────┘
```

| 参数 | 作用 | 能否省略 |
|------|------|---------|
| `charset=utf8mb4` | 用完整 UTF-8，存中文和 emoji（比如 📝）不会变问号 | **不能省** |
| `parseTime=True` | 让驱动把 MySQL 的 `DATETIME` 自动转成 Go 的 `time.Time` | **不能省**，否则扫描时间字段会报错 |
| `loc=Local` | 时间用服务器本地时区解析，避免差 8 小时 | 建议加 |

## 5. 跑起来验证

```powershell
go mod tidy
go run .
```

看到 `数据库连接成功，表结构已同步` 就成了。

**然后重复上一节第 5 节的注册/登录/查询流程**，最后做这个关键测试：

1. 注册一个用户
2. `Ctrl+C` 停掉服务
3. 重新 `go run .`
4. 用同样的账号密码登录

**能登录成功，说明数据真的存进数据库了**——这是本节唯一的验收标准。

顺便看一眼数据库里有什么：

```powershell
docker compose exec mysql mysql -uganblog -pganblogpass ganblog -e "DESCRIBE users; SELECT id, username, nickname FROM users;"
```

`password` 一列存的是 `$2a$10$...` 开头的哈希，不是明文——确认一下。

## 6. 常见问题

| 现象 | 原因 | 怎么办 |
|------|------|--------|
| `dial tcp 127.0.0.1:3306: connect: connection refused` | MySQL 没起，或还在初始化 | `docker compose ps` 看是否 healthy |
| `Access denied for user 'ganblog'` | 密码不对，或首次初始化没跑完 | 确认 compose 里的密码一致；必要时 `down -v` 重建 |
| `Unknown database 'ganblog'` | `MYSQL_DATABASE` 没生效 | 只改过 compose 的话要 `down -v` 重新初始化 |
| 时间字段扫描报错 | DSN 漏了 `parseTime=True` | 补上 |
| 中文变 `???` | 漏了 `charset=utf8mb4`，或表不是 utf8mb4 | 补 DSN；表已建错就删表重建 |
| `Error 1062: Duplicate entry` | 正常，被 `TranslateError` 转成 `ErrUserExists` 了 | 如果没转，检查 `TranslateError: true` 写了没 |

---

**下一节** → [05-代码分层.md](05-代码分层.md)
