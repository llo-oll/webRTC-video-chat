
window.onload = async () => {
    const video1Elem = document.getElementById("video1");
    const video2Elem = document.getElementById("video2");

    //Get webcam and mic stream
    const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});

    //Connect to html video element
    video1Elem.srcObject = stream;

    const peerCon1 = new RTCPeerConnection(null);
    const peerCon2 = new RTCPeerConnection(null);

    //This gets called when peerCon1.addLocalDescription is called.
    peerCon1.onicecandidate = icecandidate_event => {
        console.log("peerCon1 onicecandidate");
        peerCon2.addIceCandidate(icecandidate_event.candidate);
    };

    //This gets called when peerCon2.addLocalDescription is called.
    peerCon2.onicecandidate = icecandidate_event => {
        console.log("peerCon2 onicecandidate");
        peerCon1.addIceCandidate(icecandidate_event.candidate);
    };

    //This gets called when peerCon2.setRemoteDescription is called.
    peerCon2.ontrack = track_event =>  {
        console.log("peerCon2 ontrack");
        video2Elem.srcObject = track_event.streams[0];
    };


    stream.getTracks().forEach(
        track => {
            console.log("adding track");
            peerCon1.addTrack(track, stream);
        }
    );

    peerCon1.createOffer().then(
        description => {
            peerCon1.setLocalDescription(description);
            peerCon2.setRemoteDescription(description);

            peerCon2.createAnswer().then(
                   description => {
                       peerCon2.setLocalDescription(description);
                       peerCon1.setRemoteDescription(description);
                   }
            );
        }
    );


};



