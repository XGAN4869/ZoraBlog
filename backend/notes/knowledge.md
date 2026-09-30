# main.go

## 后端三层：**Handler → Service → Repository**

- **Handler**：接收 HTTP 请求、路由分发、参数校验、组装返回体
- **Service**：业务逻辑，流程编排、业务校验、多个 Repo 组合调用
- **Repository**：数据访问层，只负责读写数据，**不写业务**

## 并发安全

- `sync.RWMutex` 用于保护多个 goroutine 共享的 map
- `Lock()` 加写锁，`defer Unlock()` 确保函数返回前解锁
- 只读操作可使用 `RLock()` 和 `RUnlock()
- defer = finally`

# server 包 ：HTTP 层的装配中心。Handler 层

```plaintext
server.go (监听)
  → middleware.go (链式处理)
    → router.go (匹配路由)
      → Handler (参数校验、组装返回体)
        → Service (业务逻辑)
          → Repository (读写数据)
```

## router.go

### 定位

- router.go —— 路由分发
- 它创建了一个 HTTP 服务器引擎，在里面登记了"什么 URL 由什么函数处理"，然后把这个引擎交出去给 main.go 启动。

### 一句话 Gin 框架 启动流程

- 提供路由、中间件（中间逻辑）、请求处理
- Gin（中间件）洋葱模型
- router.go: 创建 gin 引擎，然后注册一个 GET 路由，路径是 /api/health，并挂上一个匿名处理函数。当有人访问这个地址时，执行该函数，用 c.JSON 返回 JSON 格式，状态码 200，响应体内容是 gin.H{...}。

### router.GET/POST 内部逻辑

- 在 Gin 的底层路由树（radix tree）上，为 GET 方法 + 指定路径 注册一个节点；
- 把 handler 这个函数作为回调存起来（注册，不是调用）；
- 将来匹配到请求时，由 Gin 的 ServeHTTP 去查找并调用这个 handler。

### router 放 main.go 和 放 router.go 的区别

```
【写法一】main 一把梭

  main()
   ├── gin.Default()              创建引擎
   ├── router.GET(...)            注册路由  ← 挂载
   └── router.Run(":8080")        启动监听
                                        │
                                        ▼
                                  请求来了 → 执行 handler


【写法二】分层

  main()
   ├── server.NewRouter()  ──┐
   │                         │  内部：
   │                         │   ├── gin.Default()
   │                         │   ├── router.GET(...)   ← 挂载（挪到了这里）
   │                         │   └── return router
   │                         │
   ├── if err := router.Run(":8080"); err != nil {
   │       log.Fatal(err)    处理启动错误
   └── }
                                        │
                                        ▼
                                  请求来了 → 执行 handler
```

## server.go

### 定位

- server.go —— HTTP 层的第一站（网络入口）

## middleware —— 逻辑拦截的第一站

# config.go
## 环境变量
所以注入环境变量的责任交给：
- **Docker Compose**（`environment:` 段）
- **PowerShell**（`$env:XXX = ...`）
- **部署平台**（K8s、云平台的环境变量配置）
`Load()` 只管"环境变量已经在进程里了，我来读"，不管"怎么进来的"。

```
启动流程：

  外部环境变量
       │
       ▼
   Load()  ← 唯一一次读环境变量 + 校验 + 填默认值
       │
       ▼
   Config{Environment, Port, DatabaseDSN}   ← 已经定好的结果
       │
       ├──▶ db 模块接收 cfg.DatabaseDSN
       ├──▶ server 模块接收 cfg.Port
       └──▶ 其他模块接收 cfg
```
关键：**`Load()` 是唯一接触 `os.Getenv` 的地方。**

# 其他基本概念

- 引擎：它本身不负责具体业务，而是负责把输入转成输出、驱动整套流程运转。

## go 目录构成相关

### package main/目录名
- GO 是包 + 标识符 的机制。
- package main + func main() = 可执行文件
- **编译负责生成机器码（目标代码），链接负责拼装 + 定址**

| 阶段          | 做什么                                | 产物                       |
| ----------- | ---------------------------------- | ------------------------ |
| 编译（compile） | 源码 → 汇编 → **机器码**，生成符号表，外部符号留占位    | `.a`（含机器码 + 符号表 + 重定位信息） |
| 链接（link）    | 合并所有 `.a`，**给符号分配最终地址**，改写占位符为真实地址 | 可执行文件                    |


```
【源码层】
main.go:   import "xg/internal/server"
           router := server.NewRouter()
                        │
                        │ ① 包名限定符
                        ▼
router.go: package server
           func NewRouter() *gin.Engine { ... }
                        │
                        │ ② 首字母大写 = 导出
                        ▼
【编译层】
 编译server 包时，编译器会记录它导出的符号（symbol）表，比如 router.go 中的 server 表里有 NewRouter
- 之后 main 包在编译时，遇到 server.NewRouter(包名+标识符)，编译器就去 server 包的符号表中查 NewRouter，找到后就 return 回来一个 &NewRouter 地址
                        │
                        ▼
【链接层】
  main.o 里对 NewRouter 的引用  ──链接──▶  server.o 里 NewRouter 的地址
                        │
                        ▼
【运行层】
  直接跳转到 NewRouter 函数地址执行（普通函数调用，零额外开销）
```
### 指令
- go build 的产物本来就是可执行文件
- go get / go mod tidy = npm i
依赖会下载到 GOPATH\pkg\mod 里, 所有项目共享的一份缓存，不同于 node_modules
- go run .

#

#
