# main.go

## 后端三层：**Handler → Service → Repository**

- **Handler**：接收 HTTP 请求、路由分发、参数校验、组装返回体
- **Service**：业务逻辑，流程编排、业务校验、多个 Repo 组合调用
- **Repository**：数据访问层，只负责读写数据，**不写业务**

```
你的三层              细分层
─────────────────────────────────────────
                    ┌─ 框架层（Engine + 路由） 中间件是 router engine 中的 recovery logger
                    ├─ 中间件层（Logger/Auth/CORS）
Handler（接入层）   ├─ Handler 函数
                    ├─ 绑定层（ShouldBindJSON）
                    └─ 校验层（validator）
─────────────────────────────────────────
Service（业务层）   └─ 业务逻辑层
─────────────────────────────────────────
Repository（数据层）├─ 数据访问层（DAO）
                    └─ 存储层（MySQL/Redis）
```

## 并发安全

- `sync.RWMutex` 用于保护多个 goroutine 共享的 map
- `Lock()` 加写锁，`defer Unlock()` 确保函数返回前解锁
- 只读操作可使用 `RLock()` 和 `RUnlock()
- defer = finally`

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
           router := router.NewRouter()
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
- 之后 main 包在编译时，遇到 router.NewRouter(包名+标识符)，编译器就去 server 包的符号表中查 NewRouter，找到后就 return 回来一个 &NewRouter 地址
                        │
                        ▼
【链接层】
  main.o 里对 NewRouter 的引用  ──链接──▶  router.o 里 NewRouter 的地址
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

## 序列化 和 反序列化
- 核心：把“内存里的对象”变成“可以传输/存储的字符串（如 JSON）”叫序列化；反过来叫反序列化。

#
