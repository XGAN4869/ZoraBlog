## Go 大小写记忆口令

1. 大写对外，小写对内：首字母大写可跨包访问，小写仅包内访问。
2. 包名小写，类型大写：`middlewares`、`Claims`。
3. 函数看用途：对外 `ParseToken()`，对内 `parseToken()`。
4. 变量小驼峰，类型大驼峰：`userName`、`UserInfo`。
5. 字段要导出，首字母大写：`token.Claims`，不是 `token.claims`。
6. JSON 标签不管导出：`json:"user_id"` 只是映射字段名，不改变访问权限。
7. 局部变量看作用域，不看大小写：大写也不会自动变成全局变量。

🔥 核心口诀：大写可跨包，小写限包内；类型大驼峰，变量小驼峰；局部看作用域，JSON 看标签。

## Go 中引用变量分配内存地址 make / new

在Go语言中对于引用类型的变量，我们在使用的时候不仅要声明它，还要为它分配内存空间，否则我们的值就没办法存储。而对于值类型的声明不需要分配内存空间，是因为它们在声明的时候已经默认分配好了内存空间。要分配内存，就引出来今天的new和make。 Go语言中new和make是内建的两个函数，主要用来分配内存。
上面的内容说的简单一点

### new 与 make 的区别

1. 二者都用于分配内存。
2. `make` 只用于初始化 `slice`、`map` 和 `channel`，返回对应类型的值，而不是指针。
3. `new(T)` 分配内存，将其中的值初始化为 `T` 的零值，返回指向该值的指针，类型是 `*T`。

## Go 语法中的结构体： 结构体值 / 结构体指针

```go
// 结构体值：适合当前函数内使用、数据比较简单的情况
p1 := person{
    name: "张三",
    age:  18,
}

// 结构体指针：适合传给其他函数，让它修改同一个实例
p2 := &person{
    name: "张三",
    age:  18,
}
fmt.Printf("%T\n", p2)     //*包名.person -- 方便找是哪个包的

p1.name = "张三" // 直接修改 p1 的字段
p2.name = "李四" // 相当于(*p2).name = "李四"，Go 简化了写法

fmt.Printf("p1=%+v\n", p1)
fmt.Printf("p2=%+v\n", p2)
```

```go
var p4 person
fmt.Printf("p4=%#v\n", p4)// p4 就是结构体实例，这样的写法有零值 person{name:"",age:0}
```

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

- `(s *userStore)` 是方法接收者，s 就作用类似 `this`，因为 \*userStore 是 "指向 User 的指针"这个类型
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
```

## if-else 简写

```go
if err := router.Run(":8080"); err != nil {
    log.Fatal(err)
} else {
    fmt.Println("服务启动成功")
}
```

## 切片 []类型

- string：适合表示和操作文本。
- []byte：适合处理网络传输、文件读写、加密等底层数据。

## Go struct / interface / 类型断言 .(T)

- \_, ok2 := method.(\*jwt.SigningMethodHMAC)

## Go 的 struct + func 
[text](https://liwenzhou.com/posts/go/struct/)
```go
type Dog struct {
	Name string
}

//Speak() 是绑定到 *Dog 类型上的方法。
func (d *Dog) Speak() string {
	return "汪汪"
}
dog := &Dog{Name: "小白"}
dog.SetName("小黑")
```
