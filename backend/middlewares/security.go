package middlewares

import (
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

func SameOrigin(publicOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodHead || c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}
		origin := c.GetHeader("Origin")
		valid := true
		if origin != "" {
			if publicOrigin != "" {
				valid = origin == publicOrigin
			} else {
				parsed, err := url.Parse(origin)
				valid = err == nil && parsed.User == nil && parsed.Path == "" && parsed.RawQuery == "" && parsed.Fragment == "" &&
					(parsed.Scheme == "http" || parsed.Scheme == "https") && strings.EqualFold(parsed.Host, c.Request.Host)
			}
		} else if c.GetHeader("Sec-Fetch-Site") == "cross-site" {
			valid = false
		}
		if !valid {
			c.AbortWithStatusJSON(403, gin.H{"code": 403, "message": "请求来源无效，请在本站操作"})
			return
		}
		c.Next()
	}
}

type attemptWindow struct {
	start time.Time
	count int
}

func AuthRateLimit(limit int, window time.Duration) gin.HandlerFunc {
	var mu sync.Mutex
	attempts := make(map[string]attemptWindow)
	return func(c *gin.Context) {
		key, now := c.ClientIP(), time.Now()
		mu.Lock()
		// Bound memory even when many different addresses hit the public endpoints.
		if len(attempts) >= 4096 {
			for ip, value := range attempts {
				if now.Sub(value.start) >= window {
					delete(attempts, ip)
				}
			}
			if len(attempts) >= 4096 {
				mu.Unlock()
				c.AbortWithStatusJSON(429, gin.H{"code": 429, "message": "请求过于频繁，请稍后重试"})
				return
			}
		}
		current := attempts[key]
		if now.Sub(current.start) >= window {
			current = attemptWindow{start: now}
		}
		current.count++
		attempts[key] = current
		mu.Unlock()
		if current.count > limit {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(429, gin.H{"code": 429, "message": "尝试次数过多，请一分钟后再试"})
			return
		}
		c.Next()
	}
}
