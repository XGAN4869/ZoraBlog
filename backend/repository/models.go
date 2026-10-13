package repository

import "time"

// 使用现有表名和字段，不嵌入 gorm.Model，避免引入软删除或额外时间字段。
type oauthUser struct {
	ID        uint      `gorm:"type:bigint unsigned;primaryKey;autoIncrement"`
	GitHubID  int64     `gorm:"column:github_id;type:bigint;not null;uniqueIndex:github_id"`
	Username  string    `gorm:"type:varchar(39);not null"`
	Email     string    `gorm:"type:varchar(254);not null;default:''"`
	CreatedAt time.Time `gorm:"type:datetime(6);not null"`
}

func (oauthUser) TableName() string { return "oauth_users" }

type oauthSession struct {
	TokenHash string    `gorm:"type:char(64) CHARACTER SET ascii;primaryKey"`
	UserID    uint      `gorm:"type:bigint unsigned;not null"`
	ExpiresAt time.Time `gorm:"type:datetime(6);not null;index:oauth_sessions_expiry"`
	User      oauthUser `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE"`
}

func (oauthSession) TableName() string { return "oauth_sessions" }

type oauthLoginRequest struct {
	StateHash    string    `gorm:"type:char(64) CHARACTER SET ascii;primaryKey"`
	CodeVerifier string    `gorm:"type:varchar(43) CHARACTER SET ascii;not null"`
	Remember     bool      `gorm:"not null"`
	ReturnTo     string    `gorm:"type:varchar(2048);not null"`
	ExpiresAt    time.Time `gorm:"type:datetime(6);not null;index:oauth_login_expiry"`
}

func (oauthLoginRequest) TableName() string { return "oauth_login_requests" }
