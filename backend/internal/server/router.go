package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// N 大写为 public，如果是小写 n 就是 private
func NewRouter() *gin.Engine {
	router := gin.Default()
	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	return router
}
