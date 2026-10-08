package main

import (
	"log"

	"xg/server"
)

func main() {
	router := server.SetupRouter() //N 大写为 public
	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
