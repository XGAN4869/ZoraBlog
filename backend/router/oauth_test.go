package router

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"xg/config"
	"xg/service"
)

func TestOAuthRoutesAndBrowserBinding(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.Config{PublicOrigin: "https://blog.example.com", CookieSecure: true}
	auth := service.NewAuth(nil, cfg)
	app, err := SetupRouter(cfg, auth)
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodGet, "/api/auth/github", nil)
	result := httptest.NewRecorder()
	app.ServeHTTP(result, request)
	if result.Code != 303 || result.Header().Get("Location") != "/?auth_error=oauth_unavailable" {
		t.Fatal("missing OAuth setup not handled")
	}

	state, _ := service.RandomToken()
	request = httptest.NewRequest(http.MethodGet, "/api/auth/github/callback?code=secret-code&state="+state, nil)
	request.AddCookie(&http.Cookie{Name: "zora_oauth_state", Value: "different-browser"})
	result = httptest.NewRecorder()
	app.ServeHTTP(result, request)
	if result.Code != 303 || result.Header().Get("Location") != "/?auth_error=invalid_state" {
		t.Fatal("browser state mismatch accepted")
	}
	for _, cookie := range result.Result().Cookies() {
		if cookie.Name == "zora_session" && cookie.Value != "" {
			t.Fatal("invalid callback created session")
		}
		if cookie.Name == "zora_oauth_state" && (!cookie.HttpOnly || !cookie.Secure || cookie.MaxAge != -1) {
			t.Fatal("OAuth cookie not cleared securely")
		}
	}

	request = httptest.NewRequest(http.MethodPost, "/api/logout", nil)
	request.Header.Set("Origin", "https://evil.example")
	result = httptest.NewRecorder()
	app.ServeHTTP(result, request)
	if result.Code != 403 {
		t.Fatal("cross-site logout accepted")
	}

	for _, route := range []struct{ method, path string }{
		{"POST", "/api/login"}, {"POST", "/api/register"}, {"GET", "/api/me"},
		{"GET", "/api/users"}, {"GET", "/api/users/1"}, {"PUT", "/api/users/1"},
		{"DELETE", "/api/users/1"}, {"GET", "/api/health"},
	} {
		result = httptest.NewRecorder()
		app.ServeHTTP(result, httptest.NewRequest(route.method, route.path, nil))
		if result.Code != 404 {
			t.Fatal("removed route still exists")
		}
	}
	for _, header := range []string{"", "Bearer provider-token"} {
		request = httptest.NewRequest(http.MethodGet, "/api/session", nil)
		request.Header.Set("Authorization", header)
		result = httptest.NewRecorder()
		app.ServeHTTP(result, request)
		if result.Code != 200 || !strings.Contains(result.Body.String(), `"user":null`) {
			t.Fatal("provider token treated as local login")
		}
	}

	// 授权码和 state 不应出现在访问日志中。
	var logs bytes.Buffer
	oldWriter := gin.DefaultWriter
	gin.DefaultWriter = &logs
	defer func() { gin.DefaultWriter = oldWriter }()
	app, err = SetupRouter(cfg, auth)
	if err != nil {
		t.Fatal(err)
	}
	result = httptest.NewRecorder()
	app.ServeHTTP(result, httptest.NewRequest(http.MethodGet, "/api/auth/github/callback?code=secret-code&state=secret-state", nil))
	if strings.Contains(logs.String(), "secret-code") || strings.Contains(logs.String(), "secret-state") {
		t.Fatal("OAuth credentials leaked to logs")
	}
}
