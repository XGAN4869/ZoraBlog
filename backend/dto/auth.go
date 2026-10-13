package dto

// UserResponse 只包含允许返回给浏览器的用户信息。
type UserResponse struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// SessionResponse 是 /api/session 的 data，未登录时 user 必须为 null。
type SessionResponse struct {
	User *UserResponse `json:"user"`
}
