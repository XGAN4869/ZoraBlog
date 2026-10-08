package handlers

//TODO 所有的 handler 文件夹都还没有分 service 业务逻辑出去，记得分出去

import (
	"net/http"
	"time"

	"xg/middlewares"

	"github.com/gin-gonic/gin"
)

// ---------- 请求结构体 ----------

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=20"`
	Password string `json:"password" binding:"required,min=6"`
	Email    string `json:"email"    binding:"omitempty,email"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// ---------- 模拟用户存储（真实项目换成数据库） ----------

type User struct {
	ID       uint
	Username string
	Password string // 真实项目存 bcrypt 哈希，不是明文
	Email    string
}

var (
	users       = map[string]*User{} // key: username
	nextID uint = 1
)

// ---------- Register 注册 ----------

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, 400, "参数错误："+err.Error())
		return
	}

	// 用户名已存在
	if _, exists := users[req.Username]; exists {
		Fail(c, http.StatusConflict, 409, "用户名已存在")
		return
	}

	// TODO: 密码应 bcrypt 加密，这里演示用明文
	user := &User{
		ID:       nextID,
		Username: req.Username,
		Password: req.Password,
		Email:    req.Email,
	}
	users[req.Username] = user
	nextID++

	OK(c, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
	})
}

// ---------- Login 登录 ----------

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		Fail(c, http.StatusBadRequest, 400, "参数错误："+err.Error())
		return
	}

	// 查用户
	user, exists := users[req.Username]
	if !exists {
		Fail(c, http.StatusUnauthorized, 401, "用户名或密码错误")
		return
	}

	// 校验密码（真实项目用 bcrypt.CompareHashAndPassword）
	if user.Password != req.Password {
		Fail(c, http.StatusUnauthorized, 401, "用户名或密码错误")
		return
	}

	// 生成 JWT
	token, err := middlewares.GenerateToken(user.ID, user.Username, 24*time.Hour)
	if err != nil {
		Fail(c, http.StatusInternalServerError, 500, "生成 token 失败")
		return
	}

	OK(c, gin.H{
		"token":     token,
		"tokenType": "Bearer",
		"expiresIn": 24 * 3600,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}
