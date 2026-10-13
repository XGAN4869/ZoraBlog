package handlers

import (
	"errors"
	"log"
	"net/http"
	"time"

	"xg/middlewares"
	"xg/repository"
	"xg/response"
	"xg/service"

	"github.com/gin-gonic/gin"
)

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=20"`
	Password string `json:"password" binding:"required,min=8,max=72"`
	Email    string `json:"email" binding:"required,email,max=254"`
	Remember bool   `json:"remember"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required,max=254"`
	Password string `json:"password" binding:"required,max=72"`
	Remember bool   `json:"remember"`
}

type AuthHandler struct {
	auth   *service.Auth
	secure bool
}

func NewAuthHandler(auth *service.Auth, secure bool) *AuthHandler {
	return &AuthHandler{auth: auth, secure: secure}
}

func bindAuth(c *gin.Context, request any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	if err := c.ShouldBindJSON(request); err != nil {
		response.Fail(c, http.StatusBadRequest, 400, "请检查填写的账户信息")
		return false
	}
	return true
}

func (h *AuthHandler) setCookie(c *gin.Context, session *service.Session, remember bool) {
	cookie := &http.Cookie{Name: middlewares.SessionCookie, Value: session.Token, Path: "/api", HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode}
	if remember {
		cookie.MaxAge = session.ExpiresIn
		cookie.Expires = session.ExpiresAt
	}
	http.SetCookie(c.Writer, cookie)
}

func (h *AuthHandler) clearCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{Name: middlewares.SessionCookie, Value: "", Path: "/api", HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode, MaxAge: -1, Expires: time.Unix(1, 0)})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var request RegisterRequest
	if !bindAuth(c, &request) {
		return
	}
	session, err := h.auth.Register(c.Request.Context(), request.Username, request.Email, request.Password, request.Remember)
	if err != nil {
		h.fail(c, err)
		return
	}
	h.setCookie(c, session, request.Remember)
	c.JSON(http.StatusCreated, response.Response{Code: 0, Message: "success", Data: session})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var request LoginRequest
	if !bindAuth(c, &request) {
		return
	}
	session, err := h.auth.Login(c.Request.Context(), request.Username, request.Password, request.Remember)
	if err != nil {
		h.fail(c, err)
		return
	}
	h.setCookie(c, session, request.Remember)
	response.OK(c, session)
}

func (h *AuthHandler) Session(c *gin.Context) {
	token, err := middlewares.RequestToken(c)
	if err != nil || token == "" {
		if err != nil {
			h.clearCookie(c)
		}
		response.OK(c, gin.H{"user": nil})
		return
	}
	user, err := h.auth.CurrentUser(c.Request.Context(), token)
	if errors.Is(err, service.ErrInvalidSession) {
		h.clearCookie(c)
		response.OK(c, gin.H{"user": nil})
		return
	}
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, gin.H{"user": user})
}

func (h *AuthHandler) Me(c *gin.Context) {
	token, err := middlewares.RequestToken(c)
	if err != nil {
		h.fail(c, service.ErrInvalidSession)
		return
	}
	user, err := h.auth.CurrentUser(c.Request.Context(), token)
	if err != nil {
		h.fail(c, err)
		return
	}
	response.OK(c, gin.H{"user": user})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token, _ := middlewares.RequestToken(c)
	if err := h.auth.Logout(c.Request.Context(), token); err != nil {
		h.fail(c, err)
		return
	}
	h.clearCookie(c)
	response.OK(c, nil)
}

func (h *AuthHandler) fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidCredentials), errors.Is(err, service.ErrInvalidSession):
		response.Fail(c, http.StatusUnauthorized, 401, err.Error())
	case errors.Is(err, repository.ErrDuplicateUser):
		response.Fail(c, http.StatusConflict, 409, "用户名或邮箱已被使用")
	case errors.Is(err, service.ErrInvalidRegistration):
		response.Fail(c, http.StatusBadRequest, 400, err.Error())
	default:
		log.Printf("authentication request failed: %v", err)
		response.Fail(c, http.StatusServiceUnavailable, 503, "服务暂时不可用，请稍后重试")
	}
}
