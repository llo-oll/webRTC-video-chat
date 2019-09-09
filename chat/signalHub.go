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

func (thisHub *hub) clientIds() []int {
	var keys []int
	for k := range thisHub.clientChanMap {
		keys = append(keys, k)
	}
	return keys
}

func (thisHub *hub) addConnection(conn *websocket.Conn) {
	thisHub.log("Received new connection")

	clientId, chanToClient, chanFromClient :=
		newWebSocketAdapter(<-thisHub.idChan, conn)
	thisHub.log("Created new webSocketAdapter")
	thisHub.clientChanMap[clientId] = chanToClient

	go func() {
		for msg := range chanFromClient {
			thisHub.log(fmt.Sprintf(
				"Received message of type %v from %v.",
				msg["type"], clientId))
			switch msg["type"] {
			case "getClientIds":
				thisHub.log(fmt.Sprintf("Sent ids to client %v.",
					clientId))
				msg := make(map[string]interface{})
				msg["type"] = "clientIds"
				clientIds := thisHub.clientIds()
				otherIds := []int{}
				for _, id := range clientIds {
					if id != clientId {
						otherIds = append(otherIds, id)
					}
				}
				msg["message"] = otherIds
				chanToClient <- msg
			}

			// msg["clientId"] = clientId
			// for id, ch := range thisHub.clientChanMap {
			// 	if id != clientId {
			// 		ch <- msg
			// 		thisHub.log(fmt.Sprintf(
			// 			"Forwarded message to %v", id))
			// 	}
			// }
		}
		close(chanToClient)
		delete(thisHub.clientChanMap, clientId)
		thisHub.log(fmt.Sprintf("Removing %v from hub", clientId))
	}()
}

func (thisHub *hub) log(entry interface{}) {
	log.Printf("Hub:\t\t%s", entry)
}
