
window.onload = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    document.getElementById("selfVideo").srcObject = stream;
};



