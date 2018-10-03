package main

import (
	"html/template"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

func main() {
	signalHub := newHub()
	http.HandleFunc("/", servePage)
	http.HandleFunc("/ws", connectClient(signalHub))
	http.HandleFunc("/script.js", serveScript)
	http.ListenAndServe(":5000", nil)
}

func serveScript(writer http.ResponseWriter, request *http.Request) {
	http.ServeFile(writer, request, "script.js")
}

//servePage is an http request handler which serves the video chat web page to a client.
func servePage(writer http.ResponseWriter, request *http.Request) {
	pageTemplate, _ := template.ParseFiles("page.html")
	pageTemplate.Execute(writer, map[string]int{})
}

//connectClient returns an http request handler which upgrades the connection to a WebSocket and adds the connection to
//the signalling hub.
func connectClient(signalHub hub) func(http.ResponseWriter, *http.Request) {
	handler :=
		func(writer http.ResponseWriter, request *http.Request) {
			//upgrade connection
			upgrader := websocket.Upgrader{
				HandshakeTimeout:  0,
				ReadBufferSize:    1024,
				WriteBufferSize:   1024,
				Subprotocols:      nil,
				Error:             nil,
				CheckOrigin:       nil,
				EnableCompression: false,
			}

			conn, err := upgrader.Upgrade(writer, request, nil)
			if err != nil {
				log.Println(err)
				return
			}
			signalHub.addConnection(conn)
		}
	return handler
}
