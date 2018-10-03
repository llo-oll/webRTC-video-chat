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
	chanFromHub <-chan map[string]interface{}
	chanToHub   chan<- map[string]interface{}
}

//newWebSocketAdapter creates a webSocketAdapter.
//
//conn should be a WebSocket connection to the html webSocketAdapter.
//
//Returns the id of the new webSocketAdapter and channels for sending and receiving messages.
func newWebSocketAdapter(id int, conn *websocket.Conn) (clientId int, toClient chan<- map[string]interface{}, fromClient <-chan map[string]interface{}) {
	chanFromHub := make(chan map[string]interface{})
	chanToHub := make(chan map[string]interface{})
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
		//thisClient.log("Received a message from hub")
		err := thisClient.conn.WriteJSON(mapMsg)
		if err != nil {
			thisClient.log(err)
			thisClient.log("Failed to write to WebSocket")
			break
		}
		//thisClient.log("sent message to client")
	}
	thisClient.log("Stopped listening for messages from hub")
	thisClient.Close()
}

//listenToSocket waits for messages coming over the WebSocket and then sends them over the send channel,
// to be picked up by the hub.
func (thisClient *webSocketAdapter) listenToSocket() {
	thisClient.log("Listening for messages from WebSocket")
	for {
		var jsonMsg map[string]interface{}
		err := thisClient.conn.ReadJSON(&jsonMsg)
		if err != nil {
			thisClient.log("Error in listenToSocket: " + err.Error())
			//TODO this drops closes the WebSocket when it receives an error: BAD BEHAVIOUR.
			break
		} else {
			//thisClient.log("Received message from client")
			thisClient.chanToHub <- jsonMsg
			//thisClient.log("Sent message to hub")
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
	log.Printf("Sock %d:\t\t%s", thisClient.id, entry)
}
