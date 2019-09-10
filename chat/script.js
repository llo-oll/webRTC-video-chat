window.onload = async () => {
    /*Set up the page to be ready to send and receive RTC peer to peer video calls*/
    {
        if (!window["WebSocket"]) {
            console.error("Websockets not available");
            return;
        }
        const videoSelfElem = document.getElementById("video1");
        const videoList = document.getElementById("videolist");
        const callButton = document.getElementById("callbutton");


        
        const selfStream = await getSelfVideoStream();
        videoSelfElem.muted = true;
        videoSelfElem.srcObject = selfStream;

        const sock = new WebSocket("wss://" + document.location.host + "/ws");
        
        
        sock.onopen = () => {
            console.log("Opened WebSocket");
            sendMessage(sock, "getClientIds", "");
        };
        
        sock.onclose = () => {
                console.log("Closed WebSocket");
        };

        sock.onmessage = receiveMessage(selfStream, videoList);
        console.log(sock); 

        // const peerCon = new RTCPeerConnection(null);

        // addTracksToConnection(peerCon, selfStream);
        // setUpIceCallbacks(sock, peerCon);

        // setUpOnTrackCallback(peerCon, videoOtherElem);

        // sock.onmessage = event => receiveMessage(event, peerCon);
        //sendMessage(sock, "haha", "");
        // Sends an offer to the other client. This begins the negotiation process.
        // callButton.onclick = () => initiateVideoCall(sock, peerCon);
    }


    // Takes the tracks from the local stream and adds them to the connection.
    function addTracksToConnection(peerCon, selfStream) {
        selfStream.getTracks().forEach(
            track => {
                peerCon.addTrack(track, selfStream);
                console.log("Added track to peer connection");
            }
        );
    }

    // TODO sometimes this fails to get a stream.
    async function getSelfVideoStream() {
        // Constraints can be used to control stuff like screen resolution fps etc.
        const constraints = {audio: true, video: true};
        // Get webcam and mic stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Opened self video stream");
        return stream;
    }

    async function initiateVideoCall(sock, peerCon) {
        let offer = await peerCon.createOffer();
        await peerCon.setLocalDescription(offer);
        sendMessage(sock, "offer", offer);
        console.log("Sent offer of video call connection");
    }


    async function receiveAnswer(answer, peerCon) {
        const description = new RTCSessionDescription(answer);
        await peerCon.setRemoteDescription(description);
        console.log("Set remote description");
    }

    async function receiveIceCandidate(candidate, peerCon) {
        if (candidate == null) {
            return;
        }
        const rtcIceCandidate = new RTCIceCandidate(candidate);
        console.log(rtcIceCandidate);
        await peerCon.addIceCandidate(rtcIceCandidate);
        console.log("Added ICE candidate to connection");
    }

    async function receiveMessage(selfStream, videoList) {

        const peerConMap = {}; 

        return async event => {
            console.log(event);
            const msg = JSON.parse(event.data);
            const sock = event.target;

            switch (msg.type) {
            case "offer":
                console.log("Received connection offer");
                const answer = await receiveOffer(msg.message,
                                                  peerConMap[msg.from], sock);
                sendMessage(sock, "answer", answer);
                console.log("Sent answer");
                break;
            case "answer":
                console.log("Received connection answer");
                receiveAnswer(msg.message, peerConMap[msg.from]);
                break;
            case "icecandidate":
                console.log("Received ice candidate");
                receiveIceCandidate(msg.message, peerConMap[msg.from]);
                break;
            case "clientIds":
                console.log("Received ids");
                console.log(msg);
                const newIds = msg.message.filter(
                    id => !Object.keys(peerConMap).includes(id));
                console.log(newIds);
                newIds.forEach(
                    id => {
                        const vid = document.createElement("video");
                        vid.setAttribute("autoplay", "");
                        peerConMap[id] = newPeerCon(selfStream, vid, sock);
                        videoList.append(vid);
                    });
                break;
            default:
                console.log("Received unclassified message");
                console.log(msg);
            }
        };
    }

    /**
     * selfStream is the camera stream from this client.
     * videoElement is for displaying the incoming stream from the new peer.
     **/
    function newPeerCon(selfStream, videoElement, sock) {
        const peerCon = new RTCPeerConnection(null);

        addTracksToConnection(peerCon, selfStream);
        setUpIceCallbacks(sock, peerCon);
        setUpOnTrackCallback(peerCon, videoElem);
        return peerCon;
    }

    async function receiveOffer(offer, peerCon) {
        console.log("Received offer of video call");
        const description = new RTCSessionDescription(offer);
        await peerCon.setRemoteDescription(description);
        console.log("Set remote description");
        const answer = await peerCon.createAnswer();
        await peerCon.setLocalDescription(answer);
        return answer;
    }

    function sendMessage(sock, type, msg) {
        console.log("Sending message");
        sock.send(JSON.stringify({"type": type, message: msg}));
    }

    // Ice callbacks are used, by the underlying system, to negotiate the
    // details of an RTC connection with the remote peer. All we need to do
    // is set up the callbacks and the rest is automagic.
    function setUpIceCallbacks(sock, peerCon) {
        // This gets called several times during the connection negotiation process.
        peerCon.onicecandidate = icecandidate_event => {
            console.log("peerCon onicecandidate callback has fired");
            console.log(icecandidate_event.candidate);
            sendMessage(sock, "icecandidate", icecandidate_event.candidate);
        };
    }

    // The ontrack callback is fired when a remote video stream has been
    // negotiated. It adds the stream to an html video element.
    function setUpOnTrackCallback(peerCon, videoOtherElem) {
        peerCon.ontrack = track_event => {
            console.log("Peer Connection ontrack callback has fired");
            videoOtherElem.srcObject = track_event.streams[0];
            console.log("Added remote stream to video element");
        };
    }
};



















