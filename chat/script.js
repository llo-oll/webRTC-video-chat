window.onload = async () => {
    /*Set up the page to be ready to send and receive RTC peer to peer video calls*/
    {
        const videoSelfElem = document.getElementById("video1");
        const videoOtherElem = document.getElementById("video2");
        const callButton = document.getElementById("callbutton");

        const sock = openWebSocket();
        const selfStream = await getSelfVideoStream();
        videoSelfElem.muted = true;
        videoSelfElem.srcObject = selfStream;

        const peerCon = new RTCPeerConnection(null);

        // Takes the tracks from the local stream and adds them to the connection.
        addTracksToConnection(peerCon, selfStream);

        // Ice callbacks are used, by the underlying system, to negotiate the
        // details of an RTC connection with the remote peer. All we need to do
        // is set up the callbacks and the rest is automagic.
        setUpIceCallbacks(sock, peerCon);

        // The ontrack callback is fired when a remote video stream has been
        // negotiated. It adds the stream to an html video element.
        setUpOnTrackCallback(peerCon, videoOtherElem);

        sock.onmessage = event => receiveMessage(event.data, peerCon, sock);

        //Sends an offer to the other client. This begins the negotiation process.
        callButton.onclick = () => initiateVideoCall(sock, peerCon);

    }

    function addTracksToConnection(peerCon, selfStream) {
        selfStream.getTracks().forEach(
            track => {
                peerCon.addTrack(track, selfStream);
                console.log("Added track to peer connection");
            }
        );
    }

    //TODO sometimes this fails to get a stream.
    async function getSelfVideoStream() {
        //Constraints can be used to control stuff like screen resolution fps etc.
        const constraints = {audio: true, video: true};
        //Get webcam and mic stream
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


    function openWebSocket() {
        if (window["WebSocket"]) {
            const sock = new WebSocket("wss://" + document.location.host + "/ws");

            sock.onmessage = event => {
                console.log("Received message");
                console.log(event);
            };

            sock.onopen = () => {
                console.log("Opened WebSocket");
            };

            sock.onclose = () => {
                console.log("Closed WebSocket");
            };
            return sock;
        }
        return null;
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

    function receiveMessage(msg, peerCon, sock) {
        msg = JSON.parse(msg);

        switch (msg.type) {
            case "offer":
                console.log("Received connection offer");
                receiveVideoCall(msg.message, peerCon, sock);
                break;
            case "answer":
                console.log("Received connection answer");
                receiveAnswer(msg.message, peerCon);
                break;
            case "icecandidate":
                console.log("Received ice candidate");
                receiveIceCandidate(msg.message, peerCon);
                break;
            default:
                console.log("Received unclassified message");
                console.log(msg);
        }
    }

    async function receiveVideoCall(offer, peerCon, sock) {
        console.log("Received offer of video call");
        const description = new RTCSessionDescription(offer);
        await peerCon.setRemoteDescription(description);
        console.log("Set remote description");
        const answer = await peerCon.createAnswer();
        await peerCon.setLocalDescription(answer);
        sendMessage(sock, "answer", answer);
        console.log("Sent answer");
    }

    function sendMessage(sock, type, msg) {
        console.log("Sending message");
        sock.send(JSON.stringify({"type": type, message: msg}));
    }

    function setUpIceCallbacks(sock, peerCon) {
        //This gets called several times during the connection negotiation process.
        peerCon.onicecandidate = icecandidate_event => {
            console.log("peerCon onicecandidate callback has fired");
            console.log(icecandidate_event.candidate);
            sendMessage(sock, "icecandidate", icecandidate_event.candidate);
        };
    }

    function setUpOnTrackCallback(peerCon, videoOtherElem) {
        peerCon.ontrack = track_event => {
            console.log("Peer Connection ontrack callback has fired");
            videoOtherElem.srcObject = track_event.streams[0];
            console.log("Added remote stream to video element");
        };
    }
};



















