```go
package main

import (
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type User struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Password  string    `json:"-"`
	Nickname  string    `json:"nickname"`
	CreatedAt time.Time `json:"createdat"`
}

// byID 和 byName 是两个 map 存储
type userStore struct { //字段名  字段类型
	mu     sync.RWMutex
	nextID uint
	byID   map[uint]*User // 哈希表的类型是，键名 unit 键值 *User
	byName map[string]*User
}

func newUserStore() *userStore {
	return &userStore{ //&实例 一次，就创造一个新实例地址，&变量是解析地址
		nextID: 1,
		byID:   make(map[uint]*User), //make = new Map()
		byName: make(map[string]*User),
	}
}

func (s *userStore) CreateUser(username, hashedPassword, nickname string) (*User, error) {
	s.mu.Lock()
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
	//通过 id username 查到 user 地址
	s.nextID++
	s.byID[user.ID] = user
	s.byName[user.Username] = user

	return user, nil
}
//这种写法不利于单元测试
func main() {
	router := gin.Default()
	//注册路由
	router.GET("/api/health", func(c *gin.Context) { // 有人访问执行回调匿名函数
		//c 可以拿请求体内容
		//响应response内容 = 状态码 + 响应头 + 响应体（整体）
		c.JSON(http.StatusOK, gin.H{ //响应体
			"status": "ok",
		})
	})

	router.Run(":8080")
}

```