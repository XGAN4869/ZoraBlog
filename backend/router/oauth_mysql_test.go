package router

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"xg/config"
	"xg/dto"
	"xg/repository"
	"xg/service"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

type githubTransport func(*http.Request) (*http.Response, error)

func (f githubTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestMySQLOAuthLogin(t *testing.T) {
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
	if dsn == "" {
		t.Fatal("missing test database DSN")
	}
	ctx := context.Background()
	store, err := repository.OpenMySQL(ctx, dsn)
	if err != nil {
		t.Fatal("MySQL connection or OAuth table initialization failed")
	}
	defer store.Close()
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		t.Fatal("MySQL test connection failed")
	}
	defer db.Close()
	cfg := config.Config{PublicOrigin: "https://blog.example.com", CookieSecure: true, GitHubClientID: "test-client",
		GitHubClientSecret: "test-secret", GitHubCallbackURL: "https://blog.example.com/api/auth/github/callback"}
	githubID := time.Now().UnixNano()
	activeID := githubID
	activeLogin := "oauth-test"
	providerFailure := false
	var states []string
	defer func() {
		for _, state := range states {
			_, _ = db.ExecContext(ctx, "DELETE FROM oauth_login_requests WHERE state_hash=?", service.TokenHash(state))
		}
		_, _ = db.ExecContext(ctx, "DELETE FROM oauth_users WHERE github_id IN (?,?)", githubID, githubID+1)
	}()

	// 只模拟 GitHub HTTP 接口；路由、数据库、state、PKCE 和 Cookie 使用实际代码。
	originalTransport := http.DefaultTransport
	http.DefaultTransport = githubTransport(func(r *http.Request) (*http.Response, error) {
		if providerFailure {
			return &http.Response{StatusCode: 503, Body: io.NopCloser(strings.NewReader("{}")), Header: make(http.Header)}, nil
		}
		body := ""
		if r.URL.Host == "github.com" && r.URL.Path == "/login/oauth/access_token" {
			_ = r.ParseForm()
			if r.PostForm.Get("client_secret") != "test-secret" || r.PostForm.Get("redirect_uri") != cfg.GitHubCallbackURL ||
				len(r.PostForm.Get("code_verifier")) != 43 || r.PostForm.Get("code") != "test-code" {
				t.Error("incorrect GitHub exchange")
			}
			body = `{"access_token":"mock-provider-token","token_type":"bearer"}`
		} else if r.URL.Host == "api.github.com" && r.URL.Path == "/user" {
			if r.Header.Get("Authorization") != "Bearer mock-provider-token" {
				t.Error("missing provider authorization")
			}
			profile, _ := json.Marshal(dto.GitHubUserResponse{ID: activeID, Login: activeLogin, Email: "shared@example.com"})
			body = string(profile)
		} else {
			t.Error("unexpected external request")
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}, nil
	})
	defer func() { http.DefaultTransport = originalTransport }()
	gin.SetMode(gin.TestMode)
	auth := service.NewAuth(store, cfg)
	app, err := SetupRouter(cfg, auth)
	if err != nil {
		t.Fatal(err)
	}

	start := func() (string, *http.Cookie) {
		t.Helper()
		res := httptest.NewRecorder()
		app.ServeHTTP(res, httptest.NewRequest("GET", "https://blog.example.com/api/auth/github?remember=true&redirect="+url.QueryEscape("/articles/go-syntax?view=code#example"), nil))
		if res.Code != 302 {
			t.Fatal("OAuth start failed")
		}
		target, _ := url.Parse(res.Header().Get("Location"))
		state := target.Query().Get("state")
		states = append(states, state)
		var cookie *http.Cookie
		for _, c := range res.Result().Cookies() {
			if c.Name == "zora_oauth_state" {
				cookie = c
			}
		}
		if cookie == nil || cookie.Value != state || !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteLaxMode || cookie.MaxAge != 600 {
			t.Fatal("invalid OAuth state cookie")
		}
		var verifier string
		if err := db.QueryRowContext(ctx, "SELECT code_verifier FROM oauth_login_requests WHERE state_hash=?", service.TokenHash(state)).Scan(&verifier); err != nil {
			t.Fatal("state not persisted")
		}
		hash := sha256.Sum256([]byte(verifier))
		if target.Query().Get("code_challenge") != base64.RawURLEncoding.EncodeToString(hash[:]) {
			t.Fatal("PKCE challenge mismatch")
		}
		return state, cookie
	}
	callback := func(state string, flow, previous *http.Cookie) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest("GET", "https://blog.example.com/api/auth/github/callback?code=test-code&state="+state, nil)
		req.AddCookie(flow)
		if previous != nil {
			req.AddCookie(previous)
		}
		res := httptest.NewRecorder()
		app.ServeHTTP(res, req)
		return res
	}
	sessionCookie := func(res *httptest.ResponseRecorder) *http.Cookie {
		t.Helper()
		if res.Code != 303 || res.Header().Get("Location") != "/articles/go-syntax?view=code#example" {
			t.Fatal("OAuth callback did not return to the requested page")
		}
		for _, c := range res.Result().Cookies() {
			if c.Name == "zora_session" && c.Value != "" {
				if !c.HttpOnly || !c.Secure || c.SameSite != http.SameSiteLaxMode || c.MaxAge < 29*24*3600 {
					t.Fatal("invalid session cookie")
				}
				return c
			}
		}
		t.Fatal("missing local session")
		return nil
	}
	state, flow := start()
	first := sessionCookie(callback(state, flow, nil))
	if _, err = auth.CurrentUser(ctx, first.Value); err != nil {
		t.Fatal("fresh session rejected")
	}
	if strings.Contains(first.Value, ".") || len(first.Value) != 43 {
		t.Fatal("local session is not opaque")
	}
	if replay := callback(state, flow, nil); replay.Header().Get("Location") != "/?auth_error=invalid_state" {
		t.Fatal("callback replay accepted")
	}

	// GitHub 改名仍然是同一个账户；再次登录会替换当前浏览器会话。
	activeLogin = "renamed-user"
	state, flow = start()
	second := sessionCookie(callback(state, flow, first))
	if _, err = auth.CurrentUser(ctx, first.Value); err != service.ErrInvalidSession {
		t.Fatal("replaced browser session still valid")
	}
	var count int
	if err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM oauth_users WHERE github_id=?", githubID).Scan(&count); err != nil || count != 1 {
		t.Fatal("GitHub identity duplicated after rename")
	}

	// 另一个 GitHub ID 即使显示名和邮箱相同，也不能登录到前一个账户。
	activeID = githubID + 1
	state, flow = start()
	third := sessionCookie(callback(state, flow, nil))
	firstUser, err := auth.CurrentUser(ctx, second.Value)
	if err != nil {
		t.Fatal("original identity lost")
	}
	otherUser, err := auth.CurrentUser(ctx, third.Value)
	if err != nil || otherUser.ID == firstUser.ID {
		t.Fatal("accounts linked by username/email")
	}

	// 新建数据库连接和后端实例后，登录仍然有效。
	secondStore, err := repository.OpenMySQL(ctx, dsn)
	if err != nil {
		t.Fatal("MySQL reconnection failed")
	}
	defer secondStore.Close()
	secondAuth := service.NewAuth(secondStore, cfg)
	if _, err = secondAuth.CurrentUser(ctx, third.Value); err != nil {
		t.Fatal("session did not survive reconnection")
	}
	req := httptest.NewRequest("POST", "https://blog.example.com/api/logout", nil)
	req.Header.Set("Origin", cfg.PublicOrigin)
	req.AddCookie(third)
	res := httptest.NewRecorder()
	app.ServeHTTP(res, req)
	if res.Code != 200 {
		t.Fatal("logout failed")
	}
	if _, err = secondAuth.CurrentUser(ctx, third.Value); err != service.ErrInvalidSession {
		t.Fatal("logout did not revoke session")
	}

	state, flow = start()
	denied := httptest.NewRequest("GET", "https://blog.example.com/api/auth/github/callback?error=access_denied&state="+state, nil)
	denied.AddCookie(flow)
	res = httptest.NewRecorder()
	app.ServeHTTP(res, denied)
	if res.Header().Get("Location") != "/articles/go-syntax?auth_error=oauth_denied&view=code#example" {
		t.Fatal("cancelled authorization did not return to the original page")
	}
	if err = db.QueryRowContext(ctx, "SELECT COUNT(*) FROM oauth_login_requests WHERE state_hash=?", service.TokenHash(state)).Scan(&count); err != nil || count != 0 {
		t.Fatal("cancelled authorization request was not consumed")
	}
	if replay := callback(state, flow, nil); replay.Header().Get("Location") != "/?auth_error=invalid_state" {
		t.Fatal("cancelled authorization request allowed replay")
	}

	state, flow = start()
	if _, err = db.ExecContext(ctx, "UPDATE oauth_login_requests SET expires_at=? WHERE state_hash=?", time.Now().UTC().Add(-time.Minute), service.TokenHash(state)); err != nil {
		t.Fatal("could not expire test state")
	}
	if res = callback(state, flow, nil); res.Header().Get("Location") != "/?auth_error=invalid_state" {
		t.Fatal("expired state accepted")
	}
	state, flow = start()
	providerFailure = true
	if res = callback(state, flow, nil); res.Header().Get("Location") != "/articles/go-syntax?auth_error=oauth_failed&view=code#example" {
		t.Fatal("provider failure accepted")
	}
	for _, c := range res.Result().Cookies() {
		if c.Name == "zora_session" && c.Value != "" {
			t.Fatal("failed provider created browser session")
		}
	}
	if _, err = db.ExecContext(ctx, "UPDATE oauth_sessions SET expires_at=? WHERE token_hash=?", time.Now().UTC().Add(-time.Minute), service.TokenHash(second.Value)); err != nil {
		t.Fatal("could not expire test session")
	}
	if _, err = secondAuth.CurrentUser(ctx, second.Value); err != service.ErrInvalidSession {
		t.Fatal("expired session accepted")
	}
}
