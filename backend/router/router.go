package router

import (
	"time"
	"xg/config"
	"xg/handlers"
	"xg/middlewares"
	"xg/service"

	"github.com/gin-gonic/gin"
)

func SetupRouter(cfg config.Config, auth *service.Auth) (*gin.Engine, error) {
	r := gin.Default()
	if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return nil, err
	}
	h := handlers.NewAuthHandler(auth, cfg.CookieSecure)
	r.GET("/api/health", func(c *gin.Context) { c.JSON(200, gin.H{"code": 0, "data": gin.H{"status": "ok"}}) })

	// 公开路由
	public := r.Group("/api")
	public.Use(middlewares.SameOrigin(cfg.PublicOrigin))
	{
		public.POST("/login", middlewares.AuthRateLimit(10, time.Minute), h.Login)
		public.POST("/register", middlewares.AuthRateLimit(5, time.Minute), h.Register)
		public.GET("/session", h.Session)
		public.POST("/logout", h.Logout)
	}

	// 需要认证的路由
	protected := r.Group("/api")
	protected.Use(middlewares.SameOrigin(cfg.PublicOrigin), middlewares.Auth(auth.ValidateSession))
	{
		// 用户
		protected.GET("/me", h.Me)
		protected.GET("/users", handlers.ListUsers)
		protected.GET("/users/:id", handlers.GetUser)
		protected.PUT("/users/:id", handlers.UpdateUser)
		protected.DELETE("/users/:id", handlers.DeleteUser)

	}

	return r, nil
}
