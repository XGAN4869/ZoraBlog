package config

import "testing"

func TestOAuthConfiguration(t *testing.T) {
	for _, key := range []string{"APP_ENV", "PORT", "DATABASE_DSN", "COOKIE_SECURE", "PUBLIC_ORIGIN", "TRUSTED_PROXIES", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_CALLBACK_URL"} {
		t.Setenv(key, "")
	}
	t.Setenv("DATABASE_DSN", "test:test@tcp(localhost:3306)/test")
	cfg, err := Load()
	if err != nil || cfg.GitHubCallbackURL != "http://localhost:5173/api/auth/github/callback" {
		t.Fatal("development without OAuth credentials should start")
	}
	t.Setenv("GITHUB_CLIENT_ID", "client")
	if _, err = Load(); err == nil {
		t.Fatal("partial credentials accepted")
	}
	t.Setenv("GITHUB_CLIENT_SECRET", "secret")
	t.Setenv("APP_ENV", "production")
	t.Setenv("PUBLIC_ORIGIN", "https://blog.example.com")
	cfg, err = Load()
	if err != nil || !cfg.CookieSecure || cfg.GitHubCallbackURL != "https://blog.example.com/api/auth/github/callback" {
		t.Fatal("production defaults invalid")
	}
	for _, callback := range []string{
		"http://blog.example.com/api/auth/github/callback",
		"https://evil.example/api/auth/github/callback",
		"https://blog.example.com/wrong-path",
		"https://user:secret@blog.example.com/api/auth/github/callback",
		"https://blog.example.com/api/auth/github/callback?extra=true",
	} {
		t.Setenv("GITHUB_CALLBACK_URL", callback)
		if _, err = Load(); err == nil {
			t.Fatal("invalid callback accepted")
		}
	}
	t.Setenv("GITHUB_CALLBACK_URL", "")
	t.Setenv("COOKIE_SECURE", "false")
	if _, err = Load(); err == nil {
		t.Fatal("production without Secure Cookie accepted")
	}
}
