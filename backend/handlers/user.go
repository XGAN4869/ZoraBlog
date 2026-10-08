package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func ListUsers(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"users": []string{"张三", "李四", "王五"},
	})
}

func GetUser(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"id": id, "name": "张三"})
}

func UpdateUser(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"msg": "更新成功"})
}

func DeleteUser(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"msg": "删除成功"})
}
