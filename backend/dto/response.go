// Package dto 定义接口传输的数据结构，不处理业务逻辑或数据库操作。
package dto

// Response 是本站 API 的统一响应格式。
type Response struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}
