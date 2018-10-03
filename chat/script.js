window.onload = async () => {
    {
        const videoSelfElem = document.getElementById("video1");
        const videoOtherElem = document.getElementById("video2");
        const callButton = document.getElementById("callbutton");

        const sock = openWebsocket();
        const selfStream = await getSelfVideoStream();
        videoSelfElem.srcObject = selfStream;

        const peerCon = new RTCPeerConnection(null);

        addTracks(peerCon, selfStream);

        setUpIceCallbacks(sock, peerCon);

        callButton.onclick = () => initiateVideoCall(sock, peerCon);

        sock.onmessage = event => receiveMessage(event.data, peerCon, sock);


        // //This gets called when peerCon.setRemoteDescription is called.
        peerCon.ontrack = track_event => {
            console.log("peerCon ontrack");
            videoOtherElem.srcObject = track_event.streams[0];
        };
    }

    async function receiveVideoCall(offer, peerCon, sock) {
        console.log("Received offer of video call");
        const description = await new RTCSessionDescription(offer);
        await peerCon.setRemoteDescription(description);
        const answer = await peerCon.createAnswer();
        await peerCon.setLocalDescription(answer);
        sendMessage(sock, "answer", answer);
    }

    function receiveAnswer(answer, peerCon) {
        const description = new RTCSessionDescription(answer);
        peerCon.setRemoteDescription(description);
    }

    function receiveIceCandidate(candidate, peerCon) {
        console.log("XXXX" + candidate);
        if (candidate === null) {
           return;
        }
        const rtcIceCandidate =  new RTCIceCandidate(candidate);
        peerCon.addIceCandidate(rtcIceCandidate);
    }


    function sendMessage(sock, type, msg) {
       sock.send(JSON.stringify({"type": type, message: msg}));
    }

    function receiveMessage(msg, peerCon, sock) {
        msg = JSON.parse(msg);
        console.log("Received message");

       switch (msg.type) {
           case "offer":
               console.log("Received offer");
               receiveVideoCall(msg.message, peerCon, sock);
               break;
           case "answer":
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


    function setUpIceCallbacks(sock, peerCon) {
        //NEGOTIATE PEER CONNECTION
        //This gets called when peerCon.setLocalDescription is called.
        //Can be called several times during the connection negotiation process.
        peerCon.onicecandidate = icecandidate_event => {
            console.log("peerCon onicecandidate");
            console.log(icecandidate_event.candidate);
            sendMessage(sock, "icecandidate", icecandidate_event.candidate);
            //sock.send(JSON.stringify(icecandidate_event.candidate));
        };
    }

    // peerCon2.setRemoteDescription(description1);
    //TODO this function assumes that all promises are fulfilled.
    async function initiateVideoCall(sock, peerCon) {
        let offer = await peerCon.createOffer();
        await peerCon.setLocalDescription(offer);
        sendMessage(sock, "offer", offer);
    }

    function addTracks(peerCon, selfStream) {
        selfStream.getTracks().forEach(
            track => {
                console.log("adding track");
                peerCon.addTrack(track, selfStream);
            }
        );
    }

    //TODO sometimes this fails to get a stream.
    async function getSelfVideoStream() {
        //Constraints can be used to control stuff like screen resolution fps etc.
        const constraints = {audio: true, video: true};
        //Get webcam and mic stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
    }

    function openWebsocket() {
        if (window["WebSocket"]) {
            const sock = new WebSocket("ws://" + document.location.host + "/ws");
            const msg = {
                "log": "WebSocket open"
            };

            sock.onmessage = event => {
                console.log(event);
            };

            sock.onopen = event => {
                console.log("Opened a websocket");
                sock.send(JSON.stringify(msg));

            };

            sock.onclose = event => {

            };
            return sock;
        }
    }
};

