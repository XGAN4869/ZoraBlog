package server

import (
	"xg/handlers"
	"xg/middlewares"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// 公开路由
	public := r.Group("/api")
	{
		public.POST("/login", handlers.Login)
		public.POST("/register", handlers.Register)
	}

	// 需要认证的路由
	protected := r.Group("/api")
	protected.Use(middlewares.Auth())
	{
		// 用户
		protected.GET("/users", handlers.ListUsers)
		protected.GET("/users/:id", handlers.GetUser)
		protected.PUT("/users/:id", handlers.UpdateUser)
		protected.DELETE("/users/:id", handlers.DeleteUser)

	}

	return r
}
