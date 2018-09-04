package main

import (
	"html/template"
	"net/http"
)

func main() {
	http.HandleFunc("/", servePage)
	http.HandleFunc("/script.js", serveScript)
	http.ListenAndServe(":5000", nil)
}

func serveScript(writer http.ResponseWriter, request *http.Request) {
	http.ServeFile(writer, request, "script.js")
}

//servePage is an http request handler which serves the webchat web page to a client.
func servePage(writer http.ResponseWriter, request *http.Request) {
	pageTemplate, _ := template.ParseFiles("page.html")
	pageTemplate.Execute(writer, nil)
	//http.ServeFile(writer, request, "page.html")
}
