package repository

import (
	"context"
	"errors"
	"time"

	mysqlDriver "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

var ErrUserNotFound = errors.New("user not found")
var ErrOAuthState = errors.New("OAuth 请求已过期或已使用")

type User struct {
	ID       uint
	Username string
	Email    string
}

type GitHubUser struct {
	ID    int64
	Login string
	Email string
}

type OAuthLogin struct {
	CodeVerifier string
	Remember     bool
	ReturnTo     string
	ExpiresAt    time.Time
}

type AuthStore interface {
	UpsertGitHubUser(context.Context, GitHubUser) (*User, error)
	CreateSession(context.Context, string, uint, time.Time) error
	SessionUser(context.Context, string, time.Time) (*User, error)
	DeleteSession(context.Context, string) error
	CreateOAuthLogin(context.Context, string, OAuthLogin) error
	ConsumeOAuthLogin(context.Context, string, time.Time) (*OAuthLogin, error)
}

type MySQLStore struct{ db *gorm.DB }

func OpenMySQL(ctx context.Context, dsn string) (*MySQLStore, error) {
	cfg, err := mysqlDriver.ParseDSN(dsn)
	if err != nil {
		return nil, errors.New("DATABASE_DSN 格式错误")
	}
	cfg.ParseTime, cfg.Loc, cfg.MultiStatements = true, time.UTC, false
	if cfg.Timeout == 0 {
		cfg.Timeout = 5 * time.Second
	}
	if cfg.ReadTimeout == 0 {
		cfg.ReadTimeout = 5 * time.Second
	}
	if cfg.WriteTimeout == 0 {
		cfg.WriteTimeout = 5 * time.Second
	}
	db, err := gorm.Open(mysql.Open(cfg.FormatDSN()), &gorm.Config{
		DisableAutomaticPing: true,
		// OAuth verifier 和会话哈希不应出现在 SQL 日志中。
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(3 * time.Minute)
	if err = sqlDB.PingContext(ctx); err != nil {
		sqlDB.Close()
		return nil, err
	}
	store := &MySQLStore{db: db}
	if err = store.migrate(ctx); err != nil {
		sqlDB.Close()
		return nil, err
	}
	return store, nil
}

func (s *MySQLStore) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// 仅按模型创建缺失的表，不自动修改已有表或历史密码账户数据。
func (s *MySQLStore) migrate(ctx context.Context) error {
	db := s.db.WithContext(ctx).Set("gorm:table_options", "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci")
	for _, model := range []any{&oauthUser{}, &oauthSession{}, &oauthLoginRequest{}} {
		if !db.Migrator().HasTable(model) {
			if err := db.Migrator().CreateTable(model); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *MySQLStore) UpsertGitHubUser(ctx context.Context, profile GitHubUser) (*User, error) {
	user := oauthUser{GitHubID: profile.ID, Username: profile.Login, Email: profile.Email, CreatedAt: time.Now().UTC()}
	db := s.db.WithContext(ctx)
	if err := db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "github_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"username", "email"}),
	}).Create(&user).Error; err != nil {
		return nil, err
	}
	// 冲突更新时重新按不可变的 GitHub ID 查询，避免依赖 LastInsertId。
	user = oauthUser{}
	if err := db.Where("github_id = ?", profile.ID).Take(&user).Error; err != nil {
		return nil, err
	}
	return &User{ID: user.ID, Username: user.Username, Email: user.Email}, nil
}

func (s *MySQLStore) CreateSession(ctx context.Context, hash string, userID uint, expires time.Time) error {
	db := s.db.WithContext(ctx)
	if err := db.Where("expires_at <= ?", time.Now().UTC()).Delete(&oauthSession{}).Error; err != nil {
		return err
	}
	return db.Create(&oauthSession{TokenHash: hash, UserID: userID, ExpiresAt: expires.UTC()}).Error
}

func (s *MySQLStore) SessionUser(ctx context.Context, hash string, now time.Time) (*User, error) {
	var user oauthUser
	err := s.db.WithContext(ctx).
		Joins("JOIN oauth_sessions ON oauth_sessions.user_id = oauth_users.id").
		Where("oauth_sessions.token_hash = ? AND oauth_sessions.expires_at > ?", hash, now.UTC()).
		Take(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return &User{ID: user.ID, Username: user.Username, Email: user.Email}, nil
}

func (s *MySQLStore) DeleteSession(ctx context.Context, hash string) error {
	return s.db.WithContext(ctx).Where("token_hash = ?", hash).Delete(&oauthSession{}).Error
}

func (s *MySQLStore) CreateOAuthLogin(ctx context.Context, hash string, login OAuthLogin) error {
	db := s.db.WithContext(ctx)
	if err := db.Where("expires_at <= ?", time.Now().UTC()).Delete(&oauthLoginRequest{}).Error; err != nil {
		return err
	}
	return db.Create(&oauthLoginRequest{
		StateHash: hash, CodeVerifier: login.CodeVerifier, Remember: login.Remember,
		ReturnTo: login.ReturnTo, ExpiresAt: login.ExpiresAt.UTC(),
	}).Error
}

// 行锁保证并发回调中只有一个请求能消费 state，多实例也不依赖进程内存。
func (s *MySQLStore) ConsumeOAuthLogin(ctx context.Context, hash string, now time.Time) (*OAuthLogin, error) {
	var request oauthLoginRequest
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("state_hash = ? AND expires_at > ?", hash, now.UTC()).Take(&request).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrOAuthState
		}
		if err != nil {
			return err
		}
		return tx.Delete(&request).Error
	})
	if err != nil {
		return nil, err
	}
	return &OAuthLogin{
		CodeVerifier: request.CodeVerifier, Remember: request.Remember,
		ReturnTo: request.ReturnTo, ExpiresAt: request.ExpiresAt,
	}, nil
}
