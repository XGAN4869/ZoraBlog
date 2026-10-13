package service

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"xg/config"
	"xg/dto"
	"xg/repository"
)

var githubLoginPattern = regexp.MustCompile(`^[a-zA-Z0-9-]{1,39}$`)
var errGitHub = errors.New("GitHub 暂时无法完成登录")

type GitHub struct {
	clientID     string
	clientSecret string
	callbackURL  string
	client       *http.Client
}

func NewGitHub(cfg config.Config) *GitHub {
	return &GitHub{
		clientID: cfg.GitHubClientID, clientSecret: cfg.GitHubClientSecret, callbackURL: cfg.GitHubCallbackURL,
		client: &http.Client{Timeout: 12 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }},
	}
}

func (g *GitHub) Configured() bool {
	return g.clientID != "" && g.clientSecret != "" && g.callbackURL != ""
}

func (g *GitHub) AuthorizeURL(state, verifier string) string {
	challenge := sha256.Sum256([]byte(verifier))
	query := url.Values{
		"client_id": {g.clientID}, "redirect_uri": {g.callbackURL}, "scope": {"read:user"},
		"state": {state}, "code_challenge": {base64.RawURLEncoding.EncodeToString(challenge[:])}, "code_challenge_method": {"S256"},
	}
	return "https://github.com/login/oauth/authorize?" + query.Encode()
}

// 授权码和 access token 只在后端短暂使用，浏览器仅获得本站的随机 Session ID。
func (g *GitHub) Exchange(ctx context.Context, code, verifier string) (*repository.GitHubUser, error) {
	form := url.Values{"client_id": {g.clientID}, "client_secret": {g.clientSecret}, "redirect_uri": {g.callbackURL}, "code": {code}, "code_verifier": {verifier}}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://github.com/login/oauth/access_token", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, errGitHub
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	var token dto.GitHubTokenResponse
	if err = g.requestJSON(request, &token); err != nil {
		return nil, err
	}
	if token.Error != "" || token.AccessToken == "" || len(token.AccessToken) > 4096 || !strings.EqualFold(token.TokenType, "bearer") ||
		strings.ContainsAny(token.AccessToken, "\r\n") {
		return nil, errGitHub
	}
	request, err = http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return nil, errGitHub
	}
	request.Header.Set("Authorization", "Bearer "+token.AccessToken)
	request.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	var profile dto.GitHubUserResponse
	if err = g.requestJSON(request, &profile); err != nil {
		return nil, err
	}
	if profile.ID <= 0 || !githubLoginPattern.MatchString(profile.Login) || len(profile.Email) > 254 {
		return nil, errGitHub
	}
	return &repository.GitHubUser{ID: profile.ID, Login: profile.Login, Email: profile.Email}, nil
}

func (g *GitHub) requestJSON(request *http.Request, target any) error {
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "Hi-Zora-Blog")
	response, err := g.client.Do(request)
	if err != nil {
		return errGitHub
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return errGitHub
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, (1<<20)+1))
	if err != nil || len(body) > 1<<20 || json.Unmarshal(body, target) != nil {
		return errGitHub
	}
	return nil
}
