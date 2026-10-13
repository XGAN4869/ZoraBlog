package repository

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
)

var ErrUserNotFound = errors.New("user not found")
var ErrDuplicateUser = errors.New("username or email already exists")

type User struct {
	ID           uint   `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	PasswordHash []byte `json:"-"`
}

type AuthStore interface {
	CreateUser(context.Context, string, string, []byte) (*User, error)
	FindUser(context.Context, string) (*User, error)
	UserByID(context.Context, uint) (*User, error)
	CreateSession(context.Context, string, uint, time.Time) error
	SessionValid(context.Context, string, uint, time.Time) (bool, error)
	DeleteSession(context.Context, string) error
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

func (s *MySQLStore) migrate(ctx context.Context) error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS auth_users (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
			username VARCHAR(20) NOT NULL,
			username_key VARCHAR(20) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL UNIQUE,
			email VARCHAR(254) NOT NULL UNIQUE,
			password_hash VARBINARY(72) NOT NULL,
			created_at DATETIME(6) NOT NULL
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		`CREATE TABLE IF NOT EXISTS auth_sessions (
			token_hash CHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
			user_id BIGINT UNSIGNED NOT NULL,
			expires_at DATETIME(6) NOT NULL,
			INDEX auth_sessions_expiry (expires_at),
			FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
	}
	for _, query := range queries {
		if _, err := s.db.ExecContext(ctx, query); err != nil {
			return err
		}
	}
	return nil
}

func (s *MySQLStore) CreateUser(ctx context.Context, username, email string, hash []byte) (*User, error) {
	result, err := s.db.ExecContext(ctx, `INSERT INTO auth_users (username, username_key, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`, username, strings.ToLower(username), email, hash, time.Now().UTC())
	if err != nil {
		var duplicate *mysql.MySQLError
		if errors.As(err, &duplicate) && duplicate.Number == 1062 {
			return nil, ErrDuplicateUser
		}
		return nil, err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &User{ID: uint(id), Username: username, Email: email, PasswordHash: hash}, nil
}

func scanUser(row *sql.Row) (*User, error) {
	user := &User{}
	if err := row.Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

func (s *MySQLStore) FindUser(ctx context.Context, identifier string) (*User, error) {
	return scanUser(s.db.QueryRowContext(ctx, `SELECT id, username, email, password_hash FROM auth_users WHERE username_key = ? OR email = ? LIMIT 1`, identifier, identifier))
}
func (s *MySQLStore) UserByID(ctx context.Context, id uint) (*User, error) {
	return scanUser(s.db.QueryRowContext(ctx, `SELECT id, username, email, password_hash FROM auth_users WHERE id = ?`, id))
}
func (s *MySQLStore) CreateSession(ctx context.Context, hash string, userID uint, expires time.Time) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM auth_sessions WHERE expires_at <= ?`, time.Now().UTC()); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx, `INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`, hash, userID, expires.UTC())
	return err
}
func (s *MySQLStore) SessionValid(ctx context.Context, hash string, userID uint, now time.Time) (bool, error) {
	var valid bool
	err := s.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND user_id = ? AND expires_at > ?)`, hash, userID, now.UTC()).Scan(&valid)
	return valid, err
}
func (s *MySQLStore) DeleteSession(ctx context.Context, hash string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM auth_sessions WHERE token_hash = ?`, hash)
	return err
}
