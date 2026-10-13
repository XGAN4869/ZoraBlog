package dto

// GitHubTokenResponse 用于读取 GitHub 的令牌交换响应，仅在后端使用。
type GitHubTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Error       string `json:"error"`
}

// GitHubUserResponse 是 GitHub /user 返回的用户资料。
type GitHubUserResponse struct {
	ID    int64  `json:"id"`
	Login string `json:"login"`
	Email string `json:"email"`
}
