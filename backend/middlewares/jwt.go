// jwt 的作用，在登录成功后发一个身份证明
package middlewares

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const jwtIssuer = "hi-zora"

func signingKey() ([]byte, error) {
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		return nil, errors.New("JWT_SECRET must contain at least 32 bytes")
	}
	return []byte(secret), nil
}

// 自定义 claims
type Claims struct {
	UserID               uint   `json:"user_id"`
	Username             string `json:"username"`
	jwt.RegisteredClaims        //结构体嵌入（Embedding）。
}

// GenerateToken 生成 token（登录成功后调用）
func GenerateToken(userID uint, username string, expire time.Duration) (string, error) {
	key, err := signingKey()
	if err != nil {
		return "", err
	}
	id := make([]byte, 16)
	if _, err := rand.Read(id); err != nil {
		return "", err
	}
	claims := Claims{
		UserID:   userID,
		Username: username,
		// Go 的结构体嵌入了，无需写 jwt.RegisteredClaims 这个对象
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(expire)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    jwtIssuer,
		ID:        hex.EncodeToString(id),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// 生成字符串形式的token
	strToken, err := token.SignedString(key)
	if err != nil {
		return "", err // 直接返回错误，让上层的 Handler 去决定是返回 500 还是 401
	}
	return strToken, nil
}

// ParseToken 解析并校验 token
func ParseToken(tokenString string) (*Claims, error) {
	key, err := signingKey()
	if err != nil {
		return nil, err
	}
	//TODO 创建 Token、填充用户数据、把指针保存到 token.Claims，这些由解析器完成
	token, err := jwt.ParseWithClaims(
		tokenString,
		&Claims{},
		func(t *jwt.Token) (any, error) {
			return key, nil
		},
		jwt.WithValidMethods([]string{"HS256"}), // 限定算法
		jwt.WithExpirationRequired(),            // 必须有过期时间
		jwt.WithIssuer(jwtIssuer),
		jwt.WithIssuedAt(),
	)

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid || claims.UserID == 0 || claims.Username == "" || claims.ID == "" {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
