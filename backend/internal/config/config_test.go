package config

import "testing"

func TestLoadRejectsMissingDatabaseDSN(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("PORT", "8080")
	t.Setenv("DATABASE_DSN", "")

	_, err := Load()
	if err == nil {
		t.Fatal("expected missing DATABASE_DSN error")
	}
}

func Load() (any, any) {
	panic("unimplemented")
}
