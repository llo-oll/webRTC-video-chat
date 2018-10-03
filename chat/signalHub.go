package main

import (
	"fmt"
	"github.com/gorilla/websocket"
	"log"
)

type hub struct {
	clientChanMap map[int]chan<- map[string]interface{}
	idChan        <-chan int
}

func newHub() hub {
	//This channel provides unique ids for clients (0,1,...)
	idChan :=
		func() <-chan int {
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

	aHub := hub{make(map[int]chan<- map[string]interface{}), idChan}
	return aHub
}

func (thisHub *hub) addConnection(conn *websocket.Conn) {
	thisHub.log("Received new connection")
	if len(thisHub.clientChanMap) >= 2 {
		//TODO client doesn't know it has been rejected
		thisHub.log("Exceeded max connections. Rejecting new connection")
		return
	}

	clientId, chanToClient, chanFromClient := newWebSocketAdapter(<-thisHub.idChan, conn)
	thisHub.log("Created new webSocketAdapter")
	thisHub.clientChanMap[clientId] = chanToClient
	go func() {
		for msg := range chanFromClient {
			thisHub.log(fmt.Sprintf("Received message of type %v from %v.", msg["type"], clientId))
			for id, ch := range thisHub.clientChanMap {
				if id != clientId {
					ch <- msg
					thisHub.log(fmt.Sprintf("Forwarded message to %v", id))
				}
			}
		}
		close(chanToClient)
		delete(thisHub.clientChanMap, clientId)
		thisHub.log(fmt.Sprintf("Removing %v from hub", clientId))
	}()
}

func (thisHub *hub) log(entry interface{}) {
	log.Printf("Hub:\t\t%s", entry)
}
