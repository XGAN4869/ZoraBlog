package main

import (
	"log"

	"xg/internal/server"
)

func main() {
	router := server.NewRouter() //N 大写为 public
	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
