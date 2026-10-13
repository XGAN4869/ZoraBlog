package config

import (
	"errors"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment    string
	Port           string
	DatabaseDSN    string //包含协议、账号、密码、地址、库名和连接参数，因此属于敏感信息。
	CookieSecure   bool
	PublicOrigin   string
	TrustedProxies []string
}

func Load() (Config, error) {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return Config{}, errors.New("无法读取 .env 配置")
	}
	cfg := Config{Environment: os.Getenv("APP_ENV"), Port: os.Getenv("PORT"), DatabaseDSN: os.Getenv("DATABASE_DSN"), PublicOrigin: strings.TrimRight(os.Getenv("PUBLIC_ORIGIN"), "/")}
	if cfg.Environment == "" {
		cfg.Environment = "development"
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	port, err := strconv.Atoi(cfg.Port)
	if err != nil || port < 1 || port > 65535 {
		return Config{}, errors.New("PORT 必须是有效端口")
	}
	if cfg.DatabaseDSN == "" {
		return Config{}, errors.New("请配置 DATABASE_DSN")
	}
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 || strings.Contains(secret, "replace-with") {
		return Config{}, errors.New("JWT_SECRET 需要至少 32 字节的随机密钥")
	}
	cfg.CookieSecure = cfg.Environment == "production"
	if value := os.Getenv("COOKIE_SECURE"); value != "" {
		cfg.CookieSecure, err = strconv.ParseBool(value)
		if err != nil {
			return Config{}, errors.New("COOKIE_SECURE 必须是 true 或 false")
		}
	}
	if cfg.Environment == "production" && (!cfg.CookieSecure || cfg.PublicOrigin == "") {
		return Config{}, errors.New("生产环境请启用 COOKIE_SECURE 并设置 HTTPS PUBLIC_ORIGIN")
	}
	if cfg.PublicOrigin != "" {
		origin, err := url.Parse(cfg.PublicOrigin)
		if err != nil || origin.Host == "" || origin.User != nil || origin.Path != "" || origin.RawQuery != "" || origin.Fragment != "" || (origin.Scheme != "http" && origin.Scheme != "https") || (cfg.Environment == "production" && origin.Scheme != "https") {
			return Config{}, errors.New("PUBLIC_ORIGIN 需要填写完整站点来源，例如 https://blog.example.com")
		}
	}
	if proxies := strings.TrimSpace(os.Getenv("TRUSTED_PROXIES")); proxies != "" {
		cfg.TrustedProxies = strings.Split(proxies, ",")
	}
	return cfg, nil
}
