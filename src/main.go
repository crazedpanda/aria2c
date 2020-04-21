package main

import (
    "fmt"
	"net/http"
	"os"
	// "github.com/anacrolix/torrent"
	// "golang.org/x/time/rate"
	// "github.com/gorilla/mux"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
    http.HandleFunc("/", HelloServer)
    http.ListenAndServe(":" + port, nil)
}

func HelloServer(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}