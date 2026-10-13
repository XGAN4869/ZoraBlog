package handlers

import (
	"crypto/subtle"
	"errors"
	"log"
	"net/http"
	"net/url"
	"time"

	"xg/dto"
	"xg/middleware"
	"xg/response"
	"xg/service"

	"github.com/gin-gonic/gin"
)

const oauthCookie = "zora_oauth_state"
const oauthPath = "/api/auth/github"

type AuthHandler struct {
	auth   *service.Auth
	secure bool
}

func NewAuthHandler(auth *service.Auth, secure bool) *AuthHandler {
	return &AuthHandler{auth: auth, secure: secure}
}

func (h *AuthHandler) setSessionCookie(c *gin.Context, session *service.Session) {
	cookie := &http.Cookie{Name: middleware.SessionCookie, Value: session.Token, Path: "/api", HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode}
	if session.Remember {
		cookie.MaxAge = int(time.Until(session.ExpiresAt).Seconds())
		cookie.Expires = session.ExpiresAt
	}
	http.SetCookie(c.Writer, cookie)
}

func (h *AuthHandler) clearCookie(c *gin.Context, name, path string) {
	http.SetCookie(c.Writer, &http.Cookie{Name: name, Path: path, HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode, MaxAge: -1, Expires: time.Unix(1, 0)})
}

// GitHubLogin 把浏览器带到 GitHub，并设置用于绑定本次登录请求的短期 Cookie。
func (h *AuthHandler) GitHubLogin(c *gin.Context) {
	redirect, err := h.auth.BeginOAuth(c.Request.Context(), c.Query("remember") == "true", c.Query("redirect"))
	if err != nil {
		code := "oauth_failed"
		if errors.Is(err, service.ErrOAuthUnavailable) {
			code = "oauth_unavailable"
		} else {
			log.Print("failed to start GitHub login")
		}
		redirectOAuthError(c, c.Query("redirect"), code)
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{Name: oauthCookie, Value: redirect.State, Path: oauthPath, HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode, MaxAge: int(service.OAuthLifetime.Seconds())})
	c.Redirect(http.StatusFound, redirect.URL)
}

// GitHubCallback 校验 state，交换授权码，并建立本站会话。
func (h *AuthHandler) GitHubCallback(c *gin.Context) {
	state := c.Query("state")
	expected, err := c.Cookie(oauthCookie)
	h.clearCookie(c, oauthCookie, oauthPath)
	if err != nil || state == "" || len(state) != 43 || subtle.ConstantTimeCompare([]byte(state), []byte(expected)) != 1 {
		redirectOAuthError(c, "", "invalid_state")
		return
	}
	if c.Query("error") != "" {
		returnTo, err := h.auth.CancelOAuth(c.Request.Context(), state)
		if err != nil {
			redirectOAuthError(c, "", "invalid_state")
			return
		}
		redirectOAuthError(c, returnTo, "oauth_denied")
		return
	}
	session, returnTo, err := h.auth.FinishOAuth(c.Request.Context(), state, c.Query("code"))
	if err != nil {
		code := "oauth_failed"
		if errors.Is(err, service.ErrOAuthState) {
			code = "invalid_state"
		}
		log.Print("GitHub login callback failed")
		redirectOAuthError(c, returnTo, code)
		return
	}
	// 替换当前浏览器旧会话，防止登录后继续保留旧凭证。
	old, err := middleware.RequestToken(c)
	if err != nil || h.auth.Logout(c.Request.Context(), old) != nil {
		_ = h.auth.Logout(c.Request.Context(), session.Token)
		redirectOAuthError(c, returnTo, "oauth_failed")
		return
	}
	h.setSessionCookie(c, session)
	c.Redirect(http.StatusSeeOther, returnTo)
}

// 回到本站页面显示提示，不再依赖独立登录页。
func redirectOAuthError(c *gin.Context, returnTo, code string) {
	if returnTo == "" {
		returnTo = "/"
	}
	target, _ := url.Parse(service.SafeReturnTo(returnTo))
	query := target.Query()
	query.Set("auth_error", code)
	target.RawQuery = query.Encode()
	c.Redirect(http.StatusSeeOther, target.String())
}

func (h *AuthHandler) Session(c *gin.Context) {
	token, err := middleware.RequestToken(c)
	if err != nil || token == "" {
		if err != nil {
			h.clearCookie(c, middleware.SessionCookie, "/api")
		}
		response.OK(c, dto.SessionResponse{User: nil})
		return
	}
	user, err := h.auth.CurrentUser(c.Request.Context(), token)
	if errors.Is(err, service.ErrInvalidSession) {
		h.clearCookie(c, middleware.SessionCookie, "/api")
		response.OK(c, dto.SessionResponse{User: nil})
		return
	}
	if err != nil {
		h.fail(c)
		return
	}
	data := dto.SessionResponse{}
	if user != nil {
		data.User = &dto.UserResponse{ID: user.ID, Username: user.Username, Email: user.Email}
	}
	response.OK(c, data)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token, err := middleware.RequestToken(c)
	if err != nil || h.auth.Logout(c.Request.Context(), token) != nil {
		h.fail(c)
		return
	}
	h.clearCookie(c, middleware.SessionCookie, "/api")
	h.clearCookie(c, oauthCookie, oauthPath)
	response.OK(c, nil)
}

func (h *AuthHandler) fail(c *gin.Context) {
	log.Print("authentication request failed")
	response.Fail(c, http.StatusServiceUnavailable, 503, "服务暂时不可用，请稍后重试")
}
