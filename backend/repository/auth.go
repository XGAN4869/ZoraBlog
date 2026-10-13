package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/go-sql-driver/mysql"
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

type MySQLStore struct{ db *sql.DB }

func OpenMySQL(ctx context.Context, dsn string) (*MySQLStore, error) {
	cfg, err := mysql.ParseDSN(dsn)
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
	db, err := sql.Open("mysql", cfg.FormatDSN())
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(3 * time.Minute)
	if err = db.PingContext(ctx); err != nil {
		db.Close()
		return nil, err
	}
	store := &MySQLStore{db: db}
	if err = store.migrate(ctx); err != nil {
		db.Close()
		return nil, err
	}
	return store, nil
}

func (s *MySQLStore) Close() error { return s.db.Close() }

// 独立的 OAuth 表保留原有密码账户数据，不按用户名或邮箱自动关联账户。
func (s *MySQLStore) migrate(ctx context.Context) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS oauth_users (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
			github_id BIGINT NOT NULL UNIQUE,
			username VARCHAR(39) NOT NULL,
			email VARCHAR(254) NOT NULL DEFAULT '',
			created_at DATETIME(6) NOT NULL
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		`CREATE TABLE IF NOT EXISTS oauth_sessions (
			token_hash CHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
			user_id BIGINT UNSIGNED NOT NULL,
			expires_at DATETIME(6) NOT NULL,
			INDEX oauth_sessions_expiry (expires_at),
			FOREIGN KEY (user_id) REFERENCES oauth_users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS oauth_login_requests (
			state_hash CHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
			code_verifier VARCHAR(43) CHARACTER SET ascii NOT NULL,
			remember BOOLEAN NOT NULL,
			return_to VARCHAR(2048) NOT NULL,
			expires_at DATETIME(6) NOT NULL,
			INDEX oauth_login_expiry (expires_at)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
	}
	for _, query := range queries {
		if _, err := s.db.ExecContext(ctx, query); err != nil {
			return err
		}
	}
	return nil
}

func (s *MySQLStore) UpsertGitHubUser(ctx context.Context, profile GitHubUser) (*User, error) {
	result, err := s.db.ExecContext(ctx, `INSERT INTO oauth_users (github_id, username, email, created_at)
		VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), username=VALUES(username), email=VALUES(email)`,
		profile.ID, profile.Login, profile.Email, time.Now().UTC())
	if err != nil {
		return nil, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &User{ID: uint(id), Username: profile.Login, Email: profile.Email}, nil
}

func (s *MySQLStore) CreateSession(ctx context.Context, hash string, userID uint, expires time.Time) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM oauth_sessions WHERE expires_at <= ?`, time.Now().UTC()); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx, `INSERT INTO oauth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`, hash, userID, expires.UTC())
	return err
}

func (s *MySQLStore) SessionUser(ctx context.Context, hash string, now time.Time) (*User, error) {
	user := &User{}
	err := s.db.QueryRowContext(ctx, `SELECT u.id, u.username, u.email FROM oauth_sessions s
		JOIN oauth_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`, hash, now.UTC()).Scan(&user.ID, &user.Username, &user.Email)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	return user, err
}

func (s *MySQLStore) DeleteSession(ctx context.Context, hash string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM oauth_sessions WHERE token_hash=?`, hash)
	return err
}

func (s *MySQLStore) CreateOAuthLogin(ctx context.Context, hash string, login OAuthLogin) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM oauth_login_requests WHERE expires_at<=?`, time.Now().UTC()); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx, `INSERT INTO oauth_login_requests (state_hash, code_verifier, remember, return_to, expires_at) VALUES (?, ?, ?, ?, ?)`,
		hash, login.CodeVerifier, login.Remember, login.ReturnTo, login.ExpiresAt.UTC())
	return err
}

// 行锁保证并发回调中只有一个请求能消费 state，多实例也不依赖进程内存。
func (s *MySQLStore) ConsumeOAuthLogin(ctx context.Context, hash string, now time.Time) (*OAuthLogin, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	login := &OAuthLogin{}
	err = tx.QueryRowContext(ctx, `SELECT code_verifier, remember, return_to, expires_at
		FROM oauth_login_requests WHERE state_hash=? AND expires_at>? FOR UPDATE`, hash, now.UTC()).
		Scan(&login.CodeVerifier, &login.Remember, &login.ReturnTo, &login.ExpiresAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrOAuthState
	}
	if err != nil {
		return nil, err
	}
	if _, err = tx.ExecContext(ctx, `DELETE FROM oauth_login_requests WHERE state_hash=?`, hash); err != nil {
		return nil, err
	}
	if err = tx.Commit(); err != nil {
		return nil, err
	}
	return login, nil
}
