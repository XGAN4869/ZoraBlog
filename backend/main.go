/**
GO 基本规范：
1. 字段名是小写即为私有，大写反之
2. Go 不允许嵌套函数，main 里不能写函数
3. 多范式语言：命令式、oop、fp、并发
*/

package main

//go的标准库和 gin 第三方库
import (
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// 内存中的一条用户记录
type User struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Password  string    `json:"-"` // - 由 bcrypt哈希 做加密处理,不能被输出
	Nickname  string    `json:"nickname"`
	CreatedAt time.Time `json:"createdat"`
}

// 内存存储：之后换成 mySql,这是假的数据库
// go 声明的时候不能赋初始值
type userStore struct {
	mu     sync.RWMutex   //读写锁，防止多个请求同时写 map 导致程序崩溃
	nextID uint           //自增id
	byID   map[uint]*User //*写 类型前面，代表指针类型，键值是地址,指向 User 类型的数据
	byName map[string]*User
}

/**
1. 构造函数（Go 惯例：new 开头表示"造一个新对象"） （返回指针，不是值）
2. 弥补没有初始值的缺陷
3.  map 的存在，不给初始值是 nil，其他的不给可以是 0 或者 ""，所以需要 make 来初始化
4. 写 function 是为了创造不同的实例出来，只写对象那一直在用同一个实例
*/

func newUserStore() *userStore {
	//1. 先创建 userStore 实例，再 &实例 返回地址
	return &userStore{
		nextID: 1,
		byID:   make(map[uint]*User), //创建一个空的哈希表，值类型是地址
		byName: make(map[string]*User),
	}
}

// Go ，s 是接收者，相当于 this，谁调用指向谁，一般是 newUserStore 完了后 其实例调用该方法
func (s *userStore) CreateUser(username, hashedPassword, nickname string) (*User, error) {
	// 给 s.mu 这把锁上锁。上锁后，其他 goroutine 想加锁就得排队等
	s.mu.Lock()

	// defer 延迟执行：注册一个函数，等当前函数返回前才执行
	defer s.mu.Unlock()

	_, exists := s.byName[username]
	if exists {
		return nil, errors.New("用户名已被占用")
	}
	user := &User{
		ID:        s.nextID,
		Username:  username,
		Password:  hashedPassword,
		Nickname:  nickname,
		CreatedAt: time.Now(),
	}
	s.nextID++
	//俩指针指向的地址，分别存在了两个 map 中，也就是有两个堆，存了一样的指针地址
	s.byID[user.ID] = user
	s.byName[user.Username] = user

	return user, nil
}

// func (s *userStore) FindByUsername (*User bool){
// 	s.mu.RLock()
// }

func main() {
	// gin.Default() 创建一个引擎，内部自带router.Use（两个有用的中间件）：
	//   Logger  —— 把每个请求打印到控制台
	//   Recovery —— 某个请求 panic 时不让整个进程挂掉
	router := gin.Default()

	// 接口常用于监控服务器是否还活着、能否正常服务
	router.GET("/api/health", func(c *gin.Context) { //一次请求的「上下文」
		/**
		gin.Context 是 Gin 框架封装的一个超级工具箱。
		它包含了这次 HTTP 请求的所有信息（比如请求头、请求参数），也提供了返回响应的方法（比如 c.JSON、c.String）。
		*/
		c.JSON(http.StatusOK, gin.H{ //响应头，响应体
			"status": "ok",
		})
	})

	// 监听 8080，阻塞在这里直到进程被杀掉：
	router.Run(":8080")
}
