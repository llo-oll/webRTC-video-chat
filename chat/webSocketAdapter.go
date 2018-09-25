package main

import (
	"github.com/gorilla/websocket"
	"log"
)

//webSocketAdapter represents a clients WebSocket as two channels, one for communication in each direction.
//messages are treated as json over the socket and map{string]string for use in the application
//
//chanFromHub is used by the rest of the application to send messages to the client.
//These are then forwarded over the WebSocket.
//
//chanToHub is used to send messages which have been received over the WebSocket to the rest of the application.
//
//Clients should be created using the newWebSocketAdapter function.
//This runs two goroutines: listenToHub and listenToSocket,
//which are responsible for dealing with communication between client and application over the websocket.
type webSocketAdapter struct {
	id          int
	conn        *websocket.Conn
	chanFromHub <-chan map[string]string
	chanToHub   chan<- map[string]string
}

//This channel provides unique ids for clients (0,1,...)
var idChan = func() <-chan int {
	ch := make(chan int)
	id := 0
	go func() {
		for {
			ch <- id
			id++
		}
	}()
	return ch
}()

//newWebSocketAdapter creates a webSocketAdapter.
//
//conn should be a WebSocket connection to the html webSocketAdapter.
//
//Returns the id of the new webSocketAdapter and channels for sending and receiving messages.
func newWebSocketAdapter(conn *websocket.Conn) (clientId int, toClient chan<- map[string]string, fromClient <-chan map[string]string) {
	chanFromHub := make(chan map[string]string)
	chanToHub := make(chan map[string]string)
	id := <-idChan
	newClient := webSocketAdapter{id, conn, chanFromHub, chanToHub}
	newClient.run()
	return id, chanFromHub, chanToHub
}

func (thisClient *webSocketAdapter) run() {
	go thisClient.listenToHub()
	go thisClient.listenToSocket()
}

//listenToHub waits for incoming messages from the hub and then sends them over the WebSocket.
func (thisClient *webSocketAdapter) listenToHub() {
	thisClient.log("Listening for messages from hub")
	for mapMsg := range thisClient.chanFromHub {
		thisClient.log("Received a message")
		err := thisClient.conn.WriteJSON(mapMsg)
		if err != nil {
			thisClient.log(err)
			thisClient.log("Failed to write to WebSocket")
			break
		}
	}
	thisClient.log("Stopped listening for messages from hub")
	thisClient.Close()
}

//listenToSocket waits for messages coming over the WebSocket and then sends them over the send channel,
// to be picked up by the hub.
func (thisClient *webSocketAdapter) listenToSocket() {
	thisClient.log("listening to messages from websocket")
	for {
		var jsonMsg map[string]string
		err := thisClient.conn.ReadJSON(&jsonMsg)
		if err != nil {
			thisClient.log(err)
			break
		} else {
			thisClient.log("Sending message")
			thisClient.chanToHub <- jsonMsg
		}
	}
	thisClient.log("Stopped listening to socket")
	thisClient.log("Closing channel to hub")
	close(thisClient.chanToHub)
	thisClient.Close()
}

//TODO the logic for closing the socket and associated channels is difficult to follow. Sort it out!
func (thisClient *webSocketAdapter) Close() {
	thisClient.log("Closing WebSocket")
	thisClient.conn.Close()
}

func (thisClient *webSocketAdapter) log(entry interface{}) {
	log.Printf("Client %d:\t%s", thisClient.id, entry)
}
