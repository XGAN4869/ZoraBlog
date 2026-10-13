package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	mysqlDriver "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

func TestMySQLGORMStore(t *testing.T) {
	if os.Getenv("RUN_MYSQL_TESTS") != "1" {
		t.Skip("set RUN_MYSQL_TESTS=1 to run the MySQL integration test")
	}
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		env, err := godotenv.Read("../.env")
		if err != nil {
			t.Fatal("set TEST_DATABASE_DSN or provide backend/.env")
		}
		dsn = env["DATABASE_DSN"]
	}
	cfg, err := mysqlDriver.ParseDSN(dsn)
	if err != nil || cfg.DBName == "" {
		t.Fatal("missing or invalid test database DSN")
	}
	cfg.ParseTime, cfg.Loc = true, time.UTC
	dsn = cfg.FormatDSN()
	ctx := context.Background()
	store, err := OpenMySQL(ctx, dsn)
	if err != nil {
		t.Fatal("GORM connection or initialization failed")
	}
	defer store.Close()
	// 独立 SQL 连接作为验证依据，不依赖 GORM 的读回结果。
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		t.Fatal("test connection failed")
	}
	defer db.Close()

	t.Run("profile update preserves identity and creation time", func(t *testing.T) {
		githubID := time.Now().UnixNano()
		t.Cleanup(func() { _, _ = db.Exec("DELETE FROM oauth_users WHERE github_id = ?", githubID) })
		first, err := store.UpsertGitHubUser(ctx, GitHubUser{ID: githubID, Login: "gorm-test", Email: "test@example.com"})
		if err != nil {
			t.Fatal("could not create test user")
		}
		var createdAt time.Time
		if err := db.QueryRow("SELECT created_at FROM oauth_users WHERE github_id = ?", githubID).Scan(&createdAt); err != nil {
			t.Fatal("could not read creation time")
		}
		updated, err := store.UpsertGitHubUser(ctx, GitHubUser{ID: githubID, Login: "renamed", Email: ""})
		if err != nil || updated.ID != first.ID || updated.Username != "renamed" || updated.Email != "" {
			t.Fatal("profile update did not preserve identity or clear the email")
		}
		var actual oauthUser
		if err := db.QueryRow("SELECT username, email, created_at FROM oauth_users WHERE github_id = ?", githubID).
			Scan(&actual.Username, &actual.Email, &actual.CreatedAt); err != nil || actual.Username != "renamed" || actual.Email != "" || !createdAt.Equal(actual.CreatedAt) {
			t.Fatal("persisted profile or creation time changed incorrectly")
		}
	})

	t.Run("concurrent instances consume state once", func(t *testing.T) {
		second, err := OpenMySQL(ctx, dsn)
		if err != nil {
			t.Fatal("second connection failed")
		}
		defer second.Close()
		hash := fmt.Sprintf("%064x", time.Now().UnixNano())
		t.Cleanup(func() { _, _ = db.Exec("DELETE FROM oauth_login_requests WHERE state_hash = ?", hash) })
		login := OAuthLogin{CodeVerifier: strings.Repeat("a", 43), Remember: true, ReturnTo: "/articles/go-syntax", ExpiresAt: time.Now().UTC().Add(time.Minute)}
		if err := store.CreateOAuthLogin(ctx, hash, login); err != nil {
			t.Fatal("could not create test state")
		}
		start := make(chan struct{})
		results := make(chan error, 2)
		for _, candidate := range []*MySQLStore{store, second} {
			go func(candidate *MySQLStore) {
				<-start
				consumed, err := candidate.ConsumeOAuthLogin(ctx, hash, time.Now().UTC())
				if err == nil && (consumed.CodeVerifier != login.CodeVerifier || !consumed.Remember || consumed.ReturnTo != login.ReturnTo) {
					err = errors.New("consumed state fields changed")
				}
				results <- err
			}(candidate)
		}
		close(start)
		successes, rejected := 0, 0
		for range 2 {
			err := <-results
			if err == nil {
				successes++
			} else if errors.Is(err, ErrOAuthState) {
				rejected++
			} else {
				t.Fatal("unexpected concurrent consumption error")
			}
		}
		if successes != 1 || rejected != 1 {
			t.Fatal("state was not consumed exactly once")
		}
		var remaining int
		if err := db.QueryRow("SELECT COUNT(*) FROM oauth_login_requests WHERE state_hash = ?", hash).Scan(&remaining); err != nil || remaining != 0 {
			t.Fatal("consumed state was not physically deleted")
		}
	})

	t.Run("new schema preserves constraints", func(t *testing.T) {
		// 仅创建并清理此测试生成的独立数据库，不删除或重建配置中的数据库。
		databaseName := fmt.Sprintf("zora_gorm_test_%x", time.Now().UnixNano())
		if _, err := db.Exec("CREATE DATABASE `" + databaseName + "` CHARACTER SET utf8mb4"); err != nil {
			var mysqlErr *mysqlDriver.MySQLError
			if errors.As(err, &mysqlErr) && (mysqlErr.Number == 1044 || mysqlErr.Number == 1142) {
				t.Skip("test account cannot create an isolated database")
			}
			t.Fatal("could not create isolated test database")
		}
		t.Cleanup(func() {
			if _, err := db.Exec("DROP DATABASE `" + databaseName + "`"); err != nil {
				t.Error("could not clean isolated test database")
			}
		})
		freshCfg := *cfg
		freshCfg.DBName = databaseName
		fresh, err := OpenMySQL(ctx, freshCfg.FormatDSN())
		if err != nil {
			t.Fatal("GORM could not initialize fresh tables")
		}
		defer fresh.Close()
		freshSQL, err := fresh.db.DB()
		if err != nil {
			t.Fatal("could not get fresh test connection")
		}
		var tables int
		if err := db.QueryRow("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ?", databaseName).Scan(&tables); err != nil || tables != 3 {
			t.Fatal("fresh database did not contain exactly three OAuth tables")
		}
		user, err := fresh.UpsertGitHubUser(ctx, GitHubUser{ID: 1, Login: "fresh-user"})
		if err != nil {
			t.Fatal("fresh user could not be created")
		}
		hash := strings.Repeat("b", 64)
		if err := fresh.CreateSession(ctx, hash, user.ID, time.Now().UTC().Add(time.Minute)); err != nil {
			t.Fatal("fresh session could not be created")
		}
		if recovered, err := fresh.SessionUser(ctx, hash, time.Now().UTC()); err != nil || recovered.ID != user.ID {
			t.Fatal("fresh session could not be read")
		}
		if err := fresh.CreateSession(ctx, hash, user.ID, time.Now().UTC().Add(time.Minute)); err == nil {
			t.Fatal("duplicate session hash accepted")
		}
		if err := fresh.CreateSession(ctx, strings.Repeat("c", 64), user.ID+1, time.Now().UTC().Add(time.Minute)); err == nil {
			t.Fatal("session without an existing user accepted")
		}
		if _, err := freshSQL.Exec("DELETE FROM oauth_users WHERE id = ?", user.ID); err != nil {
			t.Fatal("could not delete fresh test user")
		}
		var sessions int
		if err := freshSQL.QueryRow("SELECT COUNT(*) FROM oauth_sessions").Scan(&sessions); err != nil || sessions != 0 {
			t.Fatal("user deletion did not cascade to sessions")
		}
		login := OAuthLogin{CodeVerifier: strings.Repeat("d", 43), ReturnTo: "/", ExpiresAt: time.Now().UTC().Add(time.Minute)}
		if err := fresh.CreateOAuthLogin(ctx, hash, login); err != nil {
			t.Fatal("fresh OAuth state could not be created")
		}
		if _, err := fresh.ConsumeOAuthLogin(ctx, hash, time.Now().UTC()); err != nil {
			t.Fatal("fresh OAuth state could not be consumed")
		}
	})
}
