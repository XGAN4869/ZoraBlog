package middlewares

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// 生产环境请放到环境变量或配置文件
var jwtSecret = []byte("your-secret-key-change-me")

// 自定义 claims
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// GenerateToken 生成 token（登录成功后调用）
func GenerateToken(userID uint, username string, expire time.Duration) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expire)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "gin-project",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ParseToken 解析并校验 token
func ParseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		// 校验签名算法，防止 alg=none 攻击
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
