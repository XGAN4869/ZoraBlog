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
	Environment        string
	Port               string
	DatabaseDSN        string
	CookieSecure       bool
	PublicOrigin       string
	TrustedProxies     []string
	GitHubClientID     string
	GitHubClientSecret string
	GitHubCallbackURL  string
}

func Load() (Config, error) {
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		return Config{}, errors.New("无法读取 .env 配置")
	}
	cfg := Config{
		Environment: os.Getenv("APP_ENV"), Port: os.Getenv("PORT"),
		DatabaseDSN:        os.Getenv("DATABASE_DSN"),
		PublicOrigin:       strings.TrimRight(os.Getenv("PUBLIC_ORIGIN"), "/"),
		GitHubClientID:     strings.TrimSpace(os.Getenv("GITHUB_CLIENT_ID")),
		GitHubClientSecret: strings.TrimSpace(os.Getenv("GITHUB_CLIENT_SECRET")),
		GitHubCallbackURL:  strings.TrimSpace(os.Getenv("GITHUB_CALLBACK_URL")),
	}
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
		if err != nil || origin.Host == "" || origin.User != nil || origin.Path != "" || origin.RawQuery != "" || origin.Fragment != "" ||
			(origin.Scheme != "http" && origin.Scheme != "https") || (cfg.Environment == "production" && origin.Scheme != "https") {
			return Config{}, errors.New("PUBLIC_ORIGIN 需要填写完整站点来源，例如 https://blog.example.com")
		}
	}
	if (cfg.GitHubClientID == "") != (cfg.GitHubClientSecret == "") {
		return Config{}, errors.New("GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET 需要同时配置")
	}
	if cfg.GitHubCallbackURL == "" {
		origin := cfg.PublicOrigin
		if origin == "" {
			origin = "http://localhost:5173"
		}
		cfg.GitHubCallbackURL = origin + "/api/auth/github/callback"
	}
	callback, err := url.Parse(cfg.GitHubCallbackURL)
	if err != nil || callback.Host == "" || callback.User != nil || callback.RawQuery != "" || callback.Fragment != "" ||
		callback.Path != "/api/auth/github/callback" || (callback.Scheme != "http" && callback.Scheme != "https") ||
		(cfg.Environment == "production" && callback.Scheme != "https") {
		return Config{}, errors.New("GITHUB_CALLBACK_URL 需要是本站完整的 /api/auth/github/callback 地址")
	}
	if cfg.PublicOrigin != "" && callback.Scheme+"://"+callback.Host != cfg.PublicOrigin {
		return Config{}, errors.New("GITHUB_CALLBACK_URL 必须与 PUBLIC_ORIGIN 使用相同来源")
	}
	if proxies := strings.TrimSpace(os.Getenv("TRUSTED_PROXIES")); proxies != "" {
		cfg.TrustedProxies = strings.Split(proxies, ",")
		for i := range cfg.TrustedProxies {
			cfg.TrustedProxies[i] = strings.TrimSpace(cfg.TrustedProxies[i])
		}
	}
	return cfg, nil
}
