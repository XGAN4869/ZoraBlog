
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

## if-else 简写
```go
if err := router.Run(":8080"); err != nil {
    log.Fatal(err)
} else {
    fmt.Println("服务启动成功")
}
```