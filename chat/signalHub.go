package main

import (
	"fmt"
	"github.com/gorilla/websocket"
	"log"
)

type hub struct {
	clientChanMap map[int]chan<- map[string]string
}

func newHub() hub {
	aHub := hub{make(map[int]chan<- map[string]string)}
	return aHub
}

func (thisHub *hub) addConnection(conn *websocket.Conn) {
	thisHub.log("Received new connection")
	thisHub.log("Creating new webSocketAdapter")
	clientId, chanToClient, chanFromClient := newWebSocketAdapter(conn)
	thisHub.clientChanMap[clientId] = chanToClient
	go func() {
		for msg := range chanFromClient {
			for id, ch := range thisHub.clientChanMap {
				thisHub.log("recieved message.")
				if id != clientId {
					thisHub.log(fmt.Sprintf("forwarding message to %v", id))
					ch <- msg
				}
			}
		}
		thisHub.log("Closing channel to client")
		close(chanToClient)
	}()
}

func (thisHub *hub) log(entry interface{}) {
	log.Printf("Hub:\t\t%s", entry)
}
