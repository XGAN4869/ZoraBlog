package service

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"xg/config"
	"xg/repository"
)

type storedSession struct {
	userID  uint
	expires time.Time
}
type memoryStore struct {
	mu       sync.Mutex
	users    map[int64]*repository.User
	sessions map[string]storedSession
	logins   map[string]repository.OAuthLogin
}

func newMemoryStore() *memoryStore {
	return &memoryStore{users: map[int64]*repository.User{}, sessions: map[string]storedSession{}, logins: map[string]repository.OAuthLogin{}}
}
func (m *memoryStore) UpsertGitHubUser(_ context.Context, p repository.GitHubUser) (*repository.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	user, ok := m.users[p.ID]
	if !ok {
		user = &repository.User{ID: uint(len(m.users) + 1)}
		m.users[p.ID] = user
	}
	user.Username, user.Email = p.Login, p.Email
	return user, nil
}
func (m *memoryStore) CreateSession(_ context.Context, hash string, id uint, expires time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[hash] = storedSession{id, expires}
	return nil
}
func (m *memoryStore) SessionUser(_ context.Context, hash string, now time.Time) (*repository.User, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	session, ok := m.sessions[hash]
	if ok && session.expires.After(now) {
		for _, u := range m.users {
			if u.ID == session.userID {
				return u, nil
			}
		}
	}
	return nil, repository.ErrUserNotFound
}
func (m *memoryStore) DeleteSession(_ context.Context, hash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, hash)
	return nil
}
func (m *memoryStore) CreateOAuthLogin(_ context.Context, hash string, login repository.OAuthLogin) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.logins[hash] = login
	return nil
}
func (m *memoryStore) ConsumeOAuthLogin(_ context.Context, hash string, now time.Time) (*repository.OAuthLogin, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	login, ok := m.logins[hash]
	if !ok || !login.ExpiresAt.After(now) {
		return nil, repository.ErrOAuthState
	}
	delete(m.logins, hash)
	return &login, nil
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func jsonResponse(status int, body string) *http.Response {
	return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(body)), Header: make(http.Header)}
}
func testConfig() config.Config {
	return config.Config{GitHubClientID: "test-client", GitHubClientSecret: "test-secret", GitHubCallbackURL: "http://localhost:5173/api/auth/github/callback"}
}

func TestOAuthLifecycle(t *testing.T) {
	for _, remember := range []bool{false, true} {
		t.Run(map[bool]string{false: "browser", true: "remembered"}[remember], func(t *testing.T) {
			ctx := context.Background()
			store := newMemoryStore()
			auth := NewAuth(store, testConfig())
			redirect, err := auth.BeginOAuth(ctx, remember, "/articles/go-syntax?view=code#example")
			if err != nil {
				t.Fatal(err)
			}
			u, _ := url.Parse(redirect.URL)
			login := store.logins[TokenHash(redirect.State)]
			challenge := sha256.Sum256([]byte(login.CodeVerifier))
			if u.Host != "github.com" || u.Query().Get("state") != redirect.State || u.Query().Get("code_challenge_method") != "S256" ||
				u.Query().Get("code_challenge") != base64.RawURLEncoding.EncodeToString(challenge[:]) ||
				u.Query().Get("redirect_uri") != testConfig().GitHubCallbackURL || u.Query().Get("scope") != "read:user" ||
				u.Query().Get("prompt") != "select_account" {
				t.Fatal("invalid authorization request")
			}
			calls := 0
			auth.github.client.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
				calls++
				if r.URL.Host == "github.com" && r.URL.Path == "/login/oauth/access_token" {
					_ = r.ParseForm()
					if r.Method != http.MethodPost || r.PostForm.Get("code") != "test-code" ||
						r.PostForm.Get("code_verifier") != login.CodeVerifier || r.PostForm.Get("client_secret") != "test-secret" {
						t.Error("wrong code exchange")
					}
					return jsonResponse(200, `{"access_token":"provider-token","token_type":"bearer"}`), nil
				}
				if r.URL.Host != "api.github.com" || r.URL.Path != "/user" || r.Header.Get("Authorization") != "Bearer provider-token" {
					t.Error("wrong identity request")
				}
				return jsonResponse(200, `{"id":57,"login":"zora","email":null}`), nil
			})
			session, target, err := auth.FinishOAuth(ctx, redirect.State, "test-code")
			if err != nil {
				t.Fatal(err)
			}
			if target != "/articles/go-syntax?view=code#example" || session.User.Username != "zora" || session.User.Email != "" ||
				!validToken(session.Token) || session.Remember != remember {
				t.Fatal("invalid local session")
			}
			wantTTL := 24 * time.Hour
			if remember {
				wantTTL = 30 * 24 * time.Hour
			}
			if ttl := time.Until(session.ExpiresAt); ttl > wantTTL || ttl < wantTTL-time.Minute {
				t.Fatal("wrong session expiry")
			}
			if _, ok := store.sessions[session.Token]; ok {
				t.Fatal("raw session persisted")
			}
			if _, ok := store.sessions[TokenHash(session.Token)]; !ok {
				t.Fatal("session hash missing")
			}
			secondInstance := NewAuth(store, testConfig())
			if _, err = secondInstance.CurrentUser(ctx, session.Token); err != nil {
				t.Fatal("shared session rejected")
			}
			if _, _, err = auth.FinishOAuth(ctx, redirect.State, "test-code"); !errors.Is(err, ErrOAuthState) || calls != 2 {
				t.Fatal("callback replay accepted")
			}
			if err = auth.Logout(ctx, session.Token); err != nil {
				t.Fatal(err)
			}
			if _, err = secondInstance.CurrentUser(ctx, session.Token); !errors.Is(err, ErrInvalidSession) {
				t.Fatal("revoked session accepted")
			}
		})
	}
}

func TestOAuthExpiredStateAndSession(t *testing.T) {
	ctx := context.Background()
	store := newMemoryStore()
	auth := NewAuth(store, testConfig())
	start, err := auth.BeginOAuth(ctx, false, "https://evil.example")
	if err != nil {
		t.Fatal(err)
	}
	login := store.logins[TokenHash(start.State)]
	if login.ReturnTo != "/blog" {
		t.Fatal("external return URL accepted")
	}
	login.ExpiresAt = time.Now().Add(-time.Minute)
	store.logins[TokenHash(start.State)] = login
	if _, _, err = auth.FinishOAuth(ctx, start.State, "code"); !errors.Is(err, ErrOAuthState) {
		t.Fatal("expired state accepted")
	}
	token, _ := RandomToken()
	store.users[57] = &repository.User{ID: 1, Username: "zora"}
	store.sessions[TokenHash(token)] = storedSession{1, time.Now().Add(-time.Minute)}
	if _, err = auth.CurrentUser(ctx, token); !errors.Is(err, ErrInvalidSession) {
		t.Fatal("expired session accepted")
	}
	for _, invalid := range []string{"", "a.b.c", strings.Repeat("x", 100), token + "="} {
		if _, err = auth.CurrentUser(ctx, invalid); !errors.Is(err, ErrInvalidSession) {
			t.Fatal("malformed token accepted")
		}
	}
}

func TestOAuthProviderFailures(t *testing.T) {
	for _, tc := range []struct {
		name     string
		status   int
		body     string
		identity bool
	}{
		{"denied", 200, `{"error":"bad_verification_code"}`, false},
		{"outage", 503, `{"error":"outage"}`, false},
		{"malformed", 200, "invalid json", false},
		{"invalid-profile", 200, `{"id":0,"login":"zora"}`, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			store := newMemoryStore()
			auth := NewAuth(store, testConfig())
			start, _ := auth.BeginOAuth(context.Background(), false, "/blog")
			auth.github.client.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
				if tc.identity && r.URL.Host == "github.com" {
					return jsonResponse(200, `{"access_token":"token","token_type":"bearer"}`), nil
				}
				return jsonResponse(tc.status, tc.body), nil
			})
			if _, _, err := auth.FinishOAuth(context.Background(), start.State, "code"); err == nil {
				t.Fatal("failed provider accepted")
			}
			if len(store.sessions) != 0 || len(store.users) != 0 {
				t.Fatal("failed login created an account/session")
			}
			if _, _, err := auth.FinishOAuth(context.Background(), start.State, "code"); !errors.Is(err, ErrOAuthState) {
				t.Fatal("failed exchange allowed replay")
			}
		})
	}
}

func TestSafeReturnTo(t *testing.T) {
	for _, value := range []string{"", "https://evil.example", "//evil.example", "/\\evil.example", "/%5cevil.example", "/%2f%2fevil.example", "/%0d%0a", "/login", "/register", "/api/auth/github", "/api", strings.Repeat("a", 2049)} {
		if got := SafeReturnTo(value); got != "/blog" {
			t.Errorf("unsafe return URL accepted: %q -> %q", value, got)
		}
	}
	if got := SafeReturnTo("/articles/go-syntax?view=code#example"); got != "/articles/go-syntax?view=code#example" {
		t.Fatal("valid return URL changed")
	}
	if _, err := NewAuth(newMemoryStore(), config.Config{}).BeginOAuth(context.Background(), false, "/blog"); !errors.Is(err, ErrOAuthUnavailable) {
		t.Fatal("missing credentials accepted")
	}
}
