package main

import (
	"context"
	"log"
	"net/http"
	"time"
	"xg/config"
	"xg/repository"
	"xg/service"

	"xg/router"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	store, err := repository.OpenMySQL(ctx, cfg.DatabaseDSN)
	if err != nil {
		log.Fatalf("MySQL 连接或初始化失败：%v", err)
	}
	defer store.Close()
	auth := service.NewAuth(store, cfg)
	app, err := router.SetupRouter(cfg, auth)
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{Addr: ":" + cfg.Port, Handler: app, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 20 * time.Second, IdleTimeout: time.Minute}
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
