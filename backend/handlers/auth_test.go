package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"

	"xg/config"
	"xg/middleware"
	"xg/repository"
	"xg/service"

	"github.com/gin-gonic/gin"
)

type sessionStore struct {
	repository.AuthStore
	user *repository.User
	err  error
}

func (s sessionStore) SessionUser(context.Context, string, time.Time) (*repository.User, error) {
	return s.user, s.err
}

// 断言完整 JSON 契约，避免 DTO 拆分改变字段名、null 或泄漏内部数据。
func TestSessionResponseContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	token, err := service.RandomToken()
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name   string
		token  string
		user   *repository.User
		err    error
		status int
		body   string
	}{
		{"anonymous", "", nil, nil, 200, `{"code":0,"message":"success","data":{"user":null}}`},
		{"malformed credential", "invalid", nil, nil, 200, `{"code":0,"message":"success","data":{"user":null}}`},
		{"expired session", token, nil, repository.ErrUserNotFound, 200, `{"code":0,"message":"success","data":{"user":null}}`},
		{"authenticated", token, &repository.User{ID: 7, Username: "zora", Email: "zora@example.com"}, nil, 200,
			`{"code":0,"message":"success","data":{"user":{"id":7,"username":"zora","email":"zora@example.com"}}}`},
		{"empty email", token, &repository.User{ID: 7, Username: "zora"}, nil, 200,
			`{"code":0,"message":"success","data":{"user":{"id":7,"username":"zora","email":""}}}`},
		{"database failure", token, nil, errors.New("database unavailable"), 503,
			`{"code":503,"message":"服务暂时不可用，请稍后重试"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			auth := service.NewAuth(sessionStore{user: tc.user, err: tc.err}, config.Config{})
			app := gin.New()
			app.GET("/api/session", NewAuthHandler(auth, false).Session)
			request := httptest.NewRequest(http.MethodGet, "/api/session", nil)
			if tc.token != "" {
				request.AddCookie(&http.Cookie{Name: middleware.SessionCookie, Value: tc.token})
			}
			result := httptest.NewRecorder()
			app.ServeHTTP(result, request)
			if result.Code != tc.status {
				t.Fatalf("status = %d, want %d", result.Code, tc.status)
			}
			var got, want any
			if err := json.Unmarshal(result.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}
			if err := json.Unmarshal([]byte(tc.body), &want); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("response = %s, want %s", result.Body.String(), tc.body)
			}
		})
	}
}
