package main

import (
	"log"

	"xg/internal/server"
)

func main() {
	router := server.NewRouter()
	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
