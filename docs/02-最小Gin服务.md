# 02 · 最小 Gin 服务

目标：**十行代码，让浏览器能看到后端返回的 JSON。**

先跑通再学原理。这一节的内容你会 100% 在后面改掉，但它是地基。

## 1. Gin 是什么

Go 标准库 `net/http` 自己就能写 Web 服务，但写法啰嗦：路由要手写解析、
JSON 要手写序列化。**Gin 是一个 Web 框架**，把这些包好了。

前端类比：如果 `net/http` 是原生 `fetch`，Gin 就是 Express / Koa。

## 2. 写代码

在 `backend/` 目录下新建 `main.go`：

```go
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	// gin.Default() 创建一个引擎，自带两个有用的中间件：
	//   Logger  —— 把每个请求打印到控制台
	//   Recovery —— 某个请求 panic 时不让整个进程挂掉
	router := gin.Default()

	// GET /api/health —— 注册一个路由，路径必须带 /api 前缀（见 README 的约束）
	router.GET("/api/health", func(c *gin.Context) {
		// c.JSON(状态码, 内容) 把 Go 的 map 转成 JSON 写回响应。
		// gin.H 就是 map[string]any 的简写，纯粹为了少打几个字。
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	// 监听 8080，阻塞在这里直到进程被杀掉
	router.Run(":8080")
}
```

### 逐行拆解几个新手最容易懵的点

**`package main` 和 `func main()`**
Go 程序从 `main` 包的 `main` 函数开始跑，一个可执行程序必须有且只有一个。
`backend/Dockerfile` 里 `GO_BUILD_TARGET=.` 就是找根目录的这个 `package main`。

**`import` 里的空行**
```go
import (
	"net/http"

	"github.com/gin-gonic/gin"
)
```
Go 的格式化工具 `gofmt` 会**自动**把标准库和第三方库分成两组，中间空一行。
你自己不用管，`go fmt ./...` 会帮你排好。

**`c *gin.Context` 是什么**
一次请求的「上下文」。请求参数、响应、状态码全从它身上取。
类比：前端 Express 里的 `(req, res)` 合体成了一个 `c`。
`*` 表示指针——Go 里改这个对象会影响原对象，不用深究，照抄即可。

**`gin.H{...}`**
`gin.H` 是 `map[string]any`（键是字符串、值是任意类型）的类型别名。
`"status": "ok"` 会被转成 `{"status":"ok"}`。

**`router.Run(":8080")`**
冒号前省略了地址，意思是「监听所有网卡的 8080 端口」。
如果只想本机访问可以写 `"127.0.0.1:8080"`。

## 3. 跑起来

```powershell
cd C:\Project\每日练习\aiAssistCoding\Go_React_Blog\backend

go mod tidy    # 第一次运行前先整理依赖
go run .
```

第一次可能会慢，因为要编译 Gin 那一堆依赖。成功的输出长这样：

```
[GIN-debug] [WARNING] Creating an Engine instance with the Logger and Recovery middleware already attached.
[GIN-debug] GET    /api/health --> main.main.func1 (3 handlers)
[GIN-debug] Listening and serving HTTP on :8080
```

## 4. 验证

**浏览器**打开 <http://localhost:8080/api/health>，看到：

```json
{"status":"ok"}
```

**命令行**也可以（另开一个终端）：

```powershell
curl http://localhost:8080/api/health
```

再回头看运行 `go run .` 的那个终端，会多出一行访问日志：

```
[GIN] 2026/09/16 - 15:04:05 | 200 |      12.3µs |  127.0.0.1 | GET      "/api/health"
```

这就是 `gin.Default()` 里 Logger 中间件的功劳。**每次请求都会打一行，调试时非常有用。**

按 `Ctrl+C` 停掉服务。

## 5. 顺手验证一下前端连通性

这一步很值，能提前发现端口/前缀写错。

1. 后端保持运行（`go run .`）
2. 另开一个终端启动前端：

   ```powershell
   cd C:\Project\每日练习\aiAssistCoding\Go_React_Blog\fronted\GanBlog
   npm run dev
   ```

3. 在浏览器打开 <http://localhost:5173>，按 F12 打开控制台，粘贴：

   ```js
   fetch('/api/health').then(r => r.json()).then(console.log)
   ```

   应该打印出 `{status: 'ok'}`。

**这一条能通，说明整条链路是对的**：Vite 收到 `/api/health` → 转发到 `http://localhost:8080` → Gin 返回。
以后前端调不通，先跑这句确认是链路问题还是业务代码问题。

> 如果这里报 404 或 502：检查路径是不是漏了 `/api` 前缀。
> `vite.config.ts` 里只代理了 `/api`，写 `/health` 是不会被转发的。

## 6. 这一节结束时你的目录

```
backend/
├── Dockerfile
├── .dockerignore
├── go.mod          ← 01 节生成
├── go.sum          ← go mod tidy 生成
└── main.go         ← 本节新增
```

---

**下一节** → [03-用户模块-内存版.md](03-用户模块-内存版.md)
