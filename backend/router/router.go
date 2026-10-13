package router

import (
	"fmt"
	"time"
	"xg/config"
	"xg/handlers"
	middlewares "xg/middleware"
	"xg/service"

	"github.com/gin-gonic/gin"
)

// cfg 提供运行配置，auth 提供已经连接数据库的认证服务。
func SetupRouter(cfg config.Config, auth *service.Auth) (*gin.Engine, error) {
	// 回调 URL 包含临时授权码，日志仅记录路径，不记录查询参数。
	r := gin.New()
	r.Use(gin.LoggerWithFormatter(func(p gin.LogFormatterParams) string {
		return fmt.Sprintf("%s %s %s %d\n", p.TimeStamp.Format(time.RFC3339), p.Method, p.Request.URL.Path, p.StatusCode)
	}), gin.Recovery())
	if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return nil, err
	}

	r.Use(middlewares.SameOrigin(cfg.PublicOrigin))
	authHandler := handlers.NewAuthHandler(auth, cfg.CookieSecure)

	// 浏览器跳转到 GitHub；授权后 GitHub 将浏览器带回回调地址。
	r.GET("/api/auth/github", middlewares.AuthRateLimit(10, time.Minute), authHandler.GitHubLogin)
	r.GET("/api/auth/github/callback", authHandler.GitHubCallback)

	// 本站登录状态的恢复与退出。
	r.GET("/api/session", authHandler.Session)
	r.POST("/api/logout", authHandler.Logout)

	return r, nil
}
