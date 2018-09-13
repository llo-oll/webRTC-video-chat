
window.onload = async () => {

    const videoSelfElem = document.getElementById("video1");
    const videoOtherElem = document.getElementById("video2");

    //Get webcam and mic stream
    const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});

    console.log(stream);
    //Connect to html video element
    videoSelfElem.srcObject = stream;



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
        videoOtherElem.srcObject = track_event.streams[0];
    };


    stream.getTracks().forEach(
        track => {
            console.log("adding track");
            peerCon1.addTrack(track, stream);
        }
    );

    const description1 = await peerCon1.createOffer();
    peerCon1.setLocalDescription(description1);
    peerCon2.setRemoteDescription(description1);

    const description2 = await peerCon2.createAnswer();
    peerCon2.setLocalDescription(description2);
    peerCon1.setRemoteDescription(description2);


};



