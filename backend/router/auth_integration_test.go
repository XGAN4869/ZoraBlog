package router_test

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"xg/config"
	"xg/middlewares"
	"xg/repository"
	"xg/router"
	"xg/service"
)

func TestMySQLAuthenticationFlow(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("set TEST_DATABASE_DSN to run real MySQL authentication integration tests")
	}
	t.Setenv("JWT_SECRET", "test-only-secret-with-at-least-32-bytes")
	gin.SetMode(gin.TestMode)
	ctx := context.Background()
	store, err := repository.OpenMySQL(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	auth, err := service.NewAuth(store)
	if err != nil {
		t.Fatal(err)
	}
	app, err := router.SetupRouter(config.Config{}, auth)
	if err != nil {
		t.Fatal(err)
	}
	suffix := make([]byte, 5)
	_, _ = rand.Read(suffix)
	username := "qa_" + hex.EncodeToString(suffix)
	email := username + "@example.test"
	password := "integration-password-123"
	request := func(method, path, body string, cookie *http.Cookie, origin string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		req.Host = "localhost:8080"
		req.Header.Set("Content-Type", "application/json")
		if origin != "" {
			req.Header.Set("Origin", origin)
		}
		if cookie != nil {
			req.AddCookie(cookie)
		}
		recorder := httptest.NewRecorder()
		app.ServeHTTP(recorder, req)
		return recorder
	}
	account, _ := json.Marshal(map[string]any{"username": username, "email": email, "password": password})
	registered := request("POST", "/api/register", string(account), nil, "")
	if registered.Code != 201 {
		t.Fatalf("registration: %d %s", registered.Code, registered.Body.String())
	}
	user, err := store.FindUser(ctx, username)
	if err != nil {
		t.Fatal(err)
	}
	cleanup, err := sql.Open("mysql", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup.Close()
	defer func() { _, _ = cleanup.Exec(`DELETE FROM auth_users WHERE id = ? AND username = ?`, user.ID, username) }()
	if err = bcrypt.CompareHashAndPassword(user.PasswordHash, []byte(password)); err != nil {
		t.Fatal("password is not bcrypt hashed")
	}
	if strings.Contains(registered.Body.String(), password) || strings.Contains(registered.Body.String(), "password_hash") || strings.Contains(registered.Body.String(), `"token"`) {
		t.Fatal("credentials leaked in response")
	}
	cookies := registered.Result().Cookies()
	if len(cookies) != 1 || !cookies[0].HttpOnly || cookies[0].SameSite != http.SameSiteLaxMode || cookies[0].MaxAge != 0 {
		t.Fatal("invalid session cookie")
	}
	cookie := cookies[0]
	if result := request("GET", "/api/me", "", cookie, ""); result.Code != 200 {
		t.Fatal("valid session rejected")
	}
	if result := request("GET", "/api/me", "", nil, ""); result.Code != 401 {
		t.Fatal("anonymous request allowed")
	}
	if result := request("POST", "/api/register", string(account), nil, ""); result.Code != 409 {
		t.Fatal("duplicate account allowed")
	}
	if result := request("POST", "/api/logout", "", cookie, "http://evil.example"); result.Code != 403 {
		t.Fatal("cross-site mutation allowed")
	}
	if result := request("POST", "/api/logout", "", cookie, "http://localhost:8080"); result.Code != 200 {
		t.Fatal("logout failed")
	}
	if result := request("GET", "/api/me", "", cookie, ""); result.Code != 401 {
		t.Fatal("revoked session accepted")
	}
	credentials, _ := json.Marshal(map[string]any{"username": strings.ToUpper(email), "password": password, "remember": true})
	logged := request("POST", "/api/login", string(credentials), nil, "")
	if logged.Code != 200 {
		t.Fatalf("email login: %d %s", logged.Code, logged.Body.String())
	}
	persistent := logged.Result().Cookies()[0]
	if persistent.MaxAge != 30*24*3600 || persistent.Expires.Before(time.Now().Add(29*24*time.Hour)) {
		t.Fatal("remember-me expiry incorrect")
	}
	wrong := request("POST", "/api/login", `{"username":"`+username+`","password":"incorrect-password"}`, nil, "")
	if wrong.Code != 401 {
		t.Fatal("incorrect password accepted")
	}
	// Re-open the connection to confirm account and session persistence.
	reopened, err := repository.OpenMySQL(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	restored, err := service.NewAuth(reopened)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = restored.CurrentUser(ctx, persistent.Value); err != nil {
		t.Fatal("session failed to survive reconnection")
	}
	if err = auth.Logout(ctx, persistent.Value); err != nil {
		t.Fatal(err)
	}
	expired, err := middlewares.GenerateToken(user.ID, username, -time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = middlewares.ParseToken(expired); err == nil {
		t.Fatal("expired token accepted")
	}
	for i := 0; i < 10; i++ {
		wrong = request("POST", "/api/login", `{"username":"absent-user","password":"incorrect-password"}`, nil, "")
	}
	if wrong.Code != 429 {
		t.Fatal("login attempts are not rate limited")
	}
}
