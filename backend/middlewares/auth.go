package middlewares

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// 上下文里存用户信息的 key，统一常量，避免拼错
const (
	CtxUserID   = "userID"
	CtxUsername = "username"
)

// Auth 返回一个 JWT 认证中间件
// 校验请求头 Authorization: Bearer <token>
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 取 Authorization 头
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "缺少 Authorization 请求头",
			})
			return
		}

		// 2. 必须是 "Bearer xxx" 格式
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Authorization 格式错误，应为 Bearer <token>",
			})
			return
		}
		tokenString := parts[1]

		// 3. 解析并校验 token（这里用 JWT 示例）
		claims, err := ParseToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "token 无效或已过期：" + err.Error(),
			})
			return
		}

		// 4. 把用户信息写进上下文，供后续 handler 使用
		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxUsername, claims.Username)

		// 5. 放行
		c.Next()
	}
}

// GetUserID 供 handler 方便地取当前登录用户 ID
func GetUserID(c *gin.Context) (uint, bool) {
	v, ok := c.Get(CtxUserID)
	if !ok {
		return 0, false
	}
	id, ok := v.(uint)
	return id, ok
}

// GetUsername 供 handler 取当前登录用户名
func GetUsername(c *gin.Context) (string, bool) {
	v, ok := c.Get(CtxUsername)
	if !ok {
		return "", false
	}
	name, ok := v.(string)
	return name, ok
}
