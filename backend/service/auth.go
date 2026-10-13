package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/mail"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"xg/middlewares"
	"xg/repository"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("用户名或密码错误")
var ErrInvalidRegistration = errors.New("请检查用户名、邮箱和密码格式")
var ErrInvalidSession = middlewares.ErrInvalidSession
var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]{3,20}$`)

type Auth struct {
	store     repository.AuthStore
	dummyHash []byte
}

type Session struct {
	User      *repository.User `json:"user"`
	ExpiresIn int              `json:"expiresIn"`
	Token     string           `json:"-"`
	ExpiresAt time.Time        `json:"-"`
}

func NewAuth(store repository.AuthStore) (*Auth, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte("a-dummy-password-for-timing"), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	return &Auth{store: store, dummyHash: hash}, nil
}

func (a *Auth) Register(ctx context.Context, username, email, password string, remember bool) (*Session, error) {
	username, email = strings.TrimSpace(username), strings.ToLower(strings.TrimSpace(email))
	address, err := mail.ParseAddress(email)
	if !usernamePattern.MatchString(username) || err != nil || address.Address != email || len(email) > 254 || utf8.RuneCountInString(password) < 8 || len(password) > 72 {
		return nil, ErrInvalidRegistration
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user, err := a.store.CreateUser(ctx, username, email, hash)
	if err != nil {
		return nil, err
	}
	return a.newSession(ctx, user, remember)
}

func (a *Auth) Login(ctx context.Context, identifier, password string, remember bool) (*Session, error) {
	identifier = strings.ToLower(strings.TrimSpace(identifier))
	if identifier == "" || len(identifier) > 254 || len(password) == 0 || len(password) > 72 {
		return nil, ErrInvalidCredentials
	}
	user, err := a.store.FindUser(ctx, identifier)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			_ = bcrypt.CompareHashAndPassword(a.dummyHash, []byte(password))
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if bcrypt.CompareHashAndPassword(user.PasswordHash, []byte(password)) != nil {
		return nil, ErrInvalidCredentials
	}
	return a.newSession(ctx, user, remember)
}

func (a *Auth) newSession(ctx context.Context, user *repository.User, remember bool) (*Session, error) {
	ttl := 24 * time.Hour
	if remember {
		ttl = 30 * 24 * time.Hour
	}
	token, err := middlewares.GenerateToken(user.ID, user.Username, ttl)
	if err != nil {
		return nil, err
	}
	expires := time.Now().UTC().Add(ttl)
	if err = a.store.CreateSession(ctx, TokenHash(token), user.ID, expires); err != nil {
		return nil, err
	}
	return &Session{User: user, ExpiresIn: int(ttl / time.Second), Token: token, ExpiresAt: expires}, nil
}

func TokenHash(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func (a *Auth) ValidateSession(ctx context.Context, token string, id uint) error {
	valid, err := a.store.SessionValid(ctx, TokenHash(token), id, time.Now().UTC())
	if err != nil {
		return err
	}
	if !valid {
		return ErrInvalidSession
	}
	return nil
}

func (a *Auth) CurrentUser(ctx context.Context, token string) (*repository.User, error) {
	claims, err := middlewares.ParseToken(token)
	if err != nil {
		return nil, ErrInvalidSession
	}
	if err = a.ValidateSession(ctx, token, claims.UserID); err != nil {
		return nil, err
	}
	user, err := a.store.UserByID(ctx, claims.UserID)
	if errors.Is(err, repository.ErrUserNotFound) {
		return nil, ErrInvalidSession
	}
	return user, err
}

func (a *Auth) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	return a.store.DeleteSession(ctx, TokenHash(token))
}
