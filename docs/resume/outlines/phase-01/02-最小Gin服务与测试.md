# 02 · 最小 Gin 服务与测试

目标：**把当前写死在 `main()` 里的健康路由，变成一个能被自动测试的最小服务。**

不做用户登录，不连接数据库，只学习三个边界：入口、路由、测试。

## 1. 为什么不能继续往 `main.go` 里塞

`main()` 最适合做两件事：

1. 创建依赖。
2. 启动程序。

如果路由、用户存储、数据库和业务都写在 `main.go`，测试一个路由就必须启动整个进程。把路由创建提取成函数后，可以在测试里直接发一个模拟请求。

这不是上完整 Clean Architecture，只拆一个马上有价值的边界。

## 2. 先保护当前学习代码

当前 `backend/main.go` 有尚未完成的 `User` 和内存 `userStore`。移动入口前，把这一版作为学习快照保存到：

```text
backend/notes/examples/phase-00-main.go.txt
```

使用 `.txt` 后缀是为了避免 Go 把旧代码当成当前程序一起编译。确认快照存在后，才允许删除根目录旧入口。

## 3. 先写失败测试

创建：

```text
backend/internal/server/router_test.go
```

测试目标：

```go
func TestHealthReturnsOK(t *testing.T) {
	router := NewRouter()

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"status":"ok"`) {
		t.Fatalf("unexpected body: %s", recorder.Body.String())
	}
}
```

运行：

```powershell
cd backend
go test ./internal/server -run TestHealthReturnsOK -v
```

预期先失败，因为 `NewRouter` 还不存在。这个失败证明测试确实在约束即将实现的行为。

## 4. 写最小路由实现

创建：

```text
backend/internal/server/router.go
```

最小职责：

```go
package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	router := gin.Default()
	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	return router
}
```

重新运行测试，预期通过。

## 5. 创建真正的程序入口

创建：

```text
backend/cmd/server/main.go
```

当前 module 名是 `xg`，所以入口可以导入：

```go
package main

import (
	"log"

	"xg/internal/server"
)

func main() {
	router := server.NewRouter()
	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
```

重点：不能再写 `router.Run(":8080")` 后完全忽略错误。

## 6. 本地运行与验证

```powershell
cd backend
go test ./...
go run ./cmd/server
```

另开一个终端：

```powershell
curl http://localhost:8080/api/health
```

预期：

```json
{"status":"ok"}
```

确认快照、测试和新入口均存在后，才能删除 `backend/main.go`。

## 7. 完成检查

- [x] 旧 `main.go` 已保存为不参与编译的学习快照。
- [x] `NewRouter()` 测试先失败后通过。
- [x] `cmd/server/main.go` 只负责启动。
- [x] `/api/health` 行为保持兼容。
- [x] `go test ./...` 不再只显示 `[no test files]`。
- [x] `go run ./cmd/server` 可以启动。

---

[上一篇](01-保护现场与修正目录.md) · [返回目录](README.md) · [下一篇：03 · 配置与结构化日志](03-配置与结构化日志.md)
