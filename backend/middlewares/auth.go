package middlewares

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// 上下文里存用户信息的 key，统一常量，避免拼错
const (
	SessionCookie = "zora_session"
	CtxUserID     = "userID"
	CtxUsername   = "username"
)

var ErrInvalidSession = errors.New("登录状态已失效，请重新登录")

func RequestToken(c *gin.Context) (string, error) {
	if header := c.GetHeader("Authorization"); header != "" {
		parts := strings.Fields(header)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return "", ErrInvalidSession
		}
		return parts[1], nil
	}
	token, err := c.Cookie(SessionCookie)
	if errors.Is(err, http.ErrNoCookie) {
		return "", nil
	}
	return token, err
}

// Auth 返回一个 JWT 认证中间件
// 校验请求头 Authorization: Bearer <token>
func Auth(validate func(context.Context, string, uint) error) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 取 Authorization 头
		tokenString, err := RequestToken(c)
		if err != nil || tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "请先登录",
			})
			return
		}

		// 3. 解析并校验 token（这里用 JWT 示例）
		claims, err := ParseToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": ErrInvalidSession.Error(),
			})
			return
		}
		if err = validate(c.Request.Context(), tokenString, claims.UserID); err != nil {
			if errors.Is(err, ErrInvalidSession) {
				c.AbortWithStatusJSON(401, gin.H{"code": 401, "message": ErrInvalidSession.Error()})
			} else {
				c.AbortWithStatusJSON(503, gin.H{"code": 503, "message": "认证服务暂时不可用，请稍后重试"})
			}
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
