package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/url"
	"strings"
	"time"

	"xg/config"
	"xg/repository"
)

var ErrInvalidSession = errors.New("登录状态已失效，请重新登录")
var ErrOAuthUnavailable = errors.New("GitHub 登录尚未配置")
var ErrOAuthState = repository.ErrOAuthState

const OAuthLifetime = 10 * time.Minute

type Auth struct {
	store  repository.AuthStore
	github *GitHub
}

type Session struct {
	User      *repository.User `json:"user"`
	Token     string           `json:"-"`
	ExpiresAt time.Time        `json:"-"`
	Remember  bool             `json:"-"`
}

type OAuthRedirect struct {
	URL   string
	State string
}

func NewAuth(store repository.AuthStore, cfg config.Config) *Auth {
	return &Auth{store: store, github: NewGitHub(cfg)}
}

// RandomToken 生成 256 位随机凭证，内容不包含用户信息。
func RandomToken() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func TokenHash(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func validToken(token string) bool {
	decoded, err := base64.RawURLEncoding.Strict().DecodeString(token)
	return err == nil && len(decoded) == 32 && len(token) == 43
}

// SafeReturnTo 仅允许本站页面，避免登录回调成为开放重定向。
func SafeReturnTo(value string) string {
	if len(value) > 2048 || !strings.HasPrefix(value, "/") || strings.ContainsAny(value, "\\\r\n") {
		return "/blog"
	}
	target, err := url.Parse(value)
	if err != nil || target.IsAbs() || target.Host != "" || target.User != nil || !strings.HasPrefix(target.Path, "/") ||
		strings.HasPrefix(target.Path, "//") || strings.ContainsAny(target.Path, "\\\r\n") ||
		target.Path == "/login" || target.Path == "/register" || target.Path == "/api" || strings.HasPrefix(target.Path, "/api/") {
		return "/blog"
	}
	return target.String()
}

func (a *Auth) BeginOAuth(ctx context.Context, remember bool, returnTo string) (*OAuthRedirect, error) {
	if !a.github.Configured() {
		return nil, ErrOAuthUnavailable
	}
	state, err := RandomToken()
	if err != nil {
		return nil, err
	}
	verifier, err := RandomToken()
	if err != nil {
		return nil, err
	}
	login := repository.OAuthLogin{CodeVerifier: verifier, Remember: remember, ReturnTo: SafeReturnTo(returnTo), ExpiresAt: time.Now().UTC().Add(OAuthLifetime)}
	if err = a.store.CreateOAuthLogin(ctx, TokenHash(state), login); err != nil {
		return nil, err
	}
	return &OAuthRedirect{State: state, URL: a.github.AuthorizeURL(state, verifier)}, nil
}

func (a *Auth) FinishOAuth(ctx context.Context, state, code string) (*Session, string, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if !a.github.Configured() {
		return nil, "", ErrOAuthUnavailable
	}
	if !validToken(state) || code == "" || len(code) > 2048 {
		return nil, "", ErrOAuthState
	}
	login, err := a.store.ConsumeOAuthLogin(ctx, TokenHash(state), time.Now().UTC())
	if err != nil {
		return nil, "", err
	}
	returnTo := SafeReturnTo(login.ReturnTo)
	profile, err := a.github.Exchange(ctx, code, login.CodeVerifier)
	if err != nil {
		return nil, returnTo, err
	}
	user, err := a.store.UpsertGitHubUser(ctx, *profile)
	if err != nil {
		return nil, returnTo, err
	}
	token, err := RandomToken()
	if err != nil {
		return nil, returnTo, err
	}
	ttl := 24 * time.Hour
	if login.Remember {
		ttl = 30 * 24 * time.Hour
	}
	expires := time.Now().UTC().Add(ttl)
	if err = a.store.CreateSession(ctx, TokenHash(token), user.ID, expires); err != nil {
		return nil, returnTo, err
	}
	return &Session{User: user, Token: token, ExpiresAt: expires, Remember: login.Remember}, returnTo, nil
}

func (a *Auth) CancelOAuth(ctx context.Context, state string) (string, error) {
	if !validToken(state) {
		return "", ErrOAuthState
	}
	login, err := a.store.ConsumeOAuthLogin(ctx, TokenHash(state), time.Now().UTC())
	if err != nil {
		return "", err
	}
	return SafeReturnTo(login.ReturnTo), nil
}

func (a *Auth) CurrentUser(ctx context.Context, token string) (*repository.User, error) {
	if !validToken(token) {
		return nil, ErrInvalidSession
	}
	user, err := a.store.SessionUser(ctx, TokenHash(token), time.Now().UTC())
	if errors.Is(err, repository.ErrUserNotFound) {
		return nil, ErrInvalidSession
	}
	return user, err
}

func (a *Auth) Logout(ctx context.Context, token string) error {
	if !validToken(token) {
		return nil
	}
	return a.store.DeleteSession(ctx, TokenHash(token))
}
