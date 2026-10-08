package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 统一返回结构
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// OK 成功
func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    data,
	})
}

// Fail 失败
func Fail(c *gin.Context, httpStatus, code int, message string) {
	c.JSON(httpStatus, Response{
		Code:    code,
		Message: message,
	})
}

// Error 错误响应
func Error(c *gin.Context, httpStatus int, code int, message string) {
	c.JSON(httpStatus, Response{
		Code:    code,
		Message: message,
		Data:    nil,
	})
}

// BadRequest 400 错误
func BadRequest(c *gin.Context, message string) {
	Error(c, http.StatusBadRequest, 400, message)
}

// NotFound 404 错误
func NotFound(c *gin.Context, message string) {
	Error(c, http.StatusNotFound, 404, message)
}

// InternalError 500 错误
func InternalError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, 500, message)
}

// ValidationError 参数验证失败
func ValidationError(c *gin.Context, message string) {
	Error(c, http.StatusUnprocessableEntity, 422, message)
}
