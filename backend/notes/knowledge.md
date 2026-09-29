# main.go
## 后端三层：**Handler → Service → Repository**
- **Handler**：接收 HTTP 请求、路由分发、参数校验、组装返回体
- **Service**：业务逻辑，流程编排、业务校验、多个 Repo 组合调用
- **Repository**：数据访问层，只负责读写数据，**不写业务**

## 一句话 Gin 启动流程
- router.go: 创建 gin 引擎，然后注册一个 GET 路由，路径是 /api/health，并挂上一个匿名处理函数。当有人访问这个地址时，执行该函数，用 c.JSON 返回 JSON 格式，状态码 200，响应体内容是 gin.H{...}。

## map

map 的零值是 `nil`，可以读，不能直接写，写入前需要用 `make` 初始化。

- 读：`v, ok := m[k]`，返回值和是否存在
- 写：`m[k] = v` 写入前必 make，只要 make 一次即可
- 删：`delete(m, k)`

## type xxx struct

- struct 字段声明时不能直接赋初始值
- 大写开头的名称可被包外访问，小写开头只能在当前包使用
- `json:"id"` 设置 JSON 字段名，`json:"-"` 表示序列化时忽略

## 指针与方法

- User{} → 值 | p := &User{} → 指针（地址），& 读作"取地址" | *User → "指向 User 的指针"这个类型，永远是同一个 User | *p 一般和 & 搭配专门用于解引用
  ```go
  type User struct {
  Name string
  Age int
  }

  // 创建一个 User 值， u1 是 u 的拷贝，改 u1 不影响 u
  u := User{Name: "张三", Age: 18}
  u1 := u //值一样引用不一样
  // 创建一个 User 指针， u1 和 u 都是同一个地址
  u := &User{}
  u1 = u //真等
  // 创建一个 \*User（指针），& 表示"取地址"
  p := &User{Name: "李四", Age: 20}

  ```

- `(s *userStore)` 是方法接收者，s 就作用类似 `this`，因为 *userStore 是 "指向 User 的指针"这个类型
- `byID` 和 `byName` 保存的是同一个 `User` 指针
- Go 不支持在函数内再声明具名函数
- nil = 空指针

## 构造函数

`newUserStore()` 是惯用的构造函数写法，负责返回新实例并初始化 map。

```go
func newUserStore() *userStore {
	return &userStore{
		nextID: 1,
		byID:   make(map[uint]*User),
		byName: make(map[string]*User),
	}
}
````

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

### gin 框架
- 提供路由、中间件（中间逻辑）、请求处理
- Gin（中间件）洋葱模型= 夹在「请求到达」和「你的处理函数执行」之间的一段代码，它有权决定放行、拦截、或者顺便干点活。
如果 net/http 是原生 fetch，Gin 就是 Express / Koa。
- 一句话：前端 Router 决定“显示什么页面”，后端 Router 决定“谁来处理请求”。


## server.go

### 定位
- server.go —— HTTP 层的第一站（网络入口）

## middleware —— 逻辑拦截的第一站


# 其他基本概念
- 引擎：它本身不负责具体业务，而是负责把输入转成输出、驱动整套流程运转。

#

#