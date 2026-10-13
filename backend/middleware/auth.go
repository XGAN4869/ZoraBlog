package middleware

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

const SessionCookie = "zora_session"

// RequestToken 仅读取本站的 HttpOnly Cookie；不接受 GitHub access token。
func RequestToken(c *gin.Context) (string, error) {
	token, err := c.Cookie(SessionCookie)
	if errors.Is(err, http.ErrNoCookie) {
		return "", nil
	}
	return token, err
}
