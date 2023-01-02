const socket = io();    // io function 은 알아서 socket.io 를 실행하고 있는 서버를 찾는다.

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const camBtn = document.getElementById("cam");
const camSelect = document.getElementById("camSelect");

const call = document.getElementById("call");
call.hidden = true;

let myStream;
let isMute = false;
let isCamOff = false;
let roomName;
let myPeerConnection;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const curCam = myStream.getVideoTracks()[0];
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (curCam.label === camera.label) option.selected = true;
            camSelect.appendChild(option);
        })
    } catch(e) {
        console.log(e);
    }
}

async function getMedia(deviceId) {
    const initConstraints = {
        audio: true,
        video: { facingMode: "user" },
    };

    const camConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };

    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? camConstraints : initConstraints
        );
        myFace.srcObject = myStream;

        if (!deviceId) {
            await getCameras();
        }
        
        // 카메라 변경 후에도 Mute, CamOff 설정을 유지해야한다.
        myStream
            .getAudioTracks()
            .forEach((track) => {
            track.enabled = !isMute;
        });
        myStream
            .getVideoTracks()
            .forEach((track) => {
            track.enabled = !isCamOff;
        });
        
    } catch(e) {
        console.log(e);
    }
}

function handleMuteBtnClick() {
    myStream
        .getAudioTracks()
        .forEach((track) => {
        track.enabled = isMute;
    });
    
    if (isMute) {
        muteBtn.innerText = "Mute";
        isMute = false;
    } else {
        muteBtn.innerText = "UnMute";
        isMute = true;
    }
}

function handleCamBtnClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => {
        track.enabled = isCamOff;
    });

    if (isCamOff) {
        camBtn.innerText = "Turn Cam Off";
        isCamOff = false;
    } else {
        camBtn.innerText = "Turn Cam On";
        isCamOff = true;
    }
}

async function handleCamChange() {
    await getMedia(camSelect.value);
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection.getSenders().find((sender) => sender.track.kind === "video");
        console.log(videoSender);
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click", handleMuteBtnClick);
camBtn.addEventListener("click", handleCamBtnClick);
camSelect.addEventListener("input", handleCamChange);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleEnterRoomSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roomName = input.value;
}

welcomeForm.addEventListener("submit", handleEnterRoomSubmit);

// Socket Code

socket.on("welcome", async () => {
    // 누가 들어오면 기존에 있던 애가 "어 반갑소." --> createOffer();
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);    // offer 를 통해 local 에 뭘 설정 --> peerB 로 가서 remote 도 설정해야겠지?
    console.log("sent the offer");
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);   // answer 를 통해 local 에 뭘 설정 --> peerA 로 가서 remote 도 설정해야겠지?
    console.log("sent the answer");
    socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("received the candidate")
    myPeerConnection.addIceCandidate(ice);
});

// RTC Code

function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    // console.log(myStream.getTracks());
    myStream
        .getTracks()
        .forEach((track) => {
            myPeerConnection.addTrack(track, myStream);
        });
}

function handleIce(data) {
    console.log("sent the candidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    // console.log("peer's stream", data.stream);
    // const peerFace = document.getElementById("peerFace");
    const peerStream = document.getElementById("peerStream");
    const peerFace = document.createElement("video");
    peerFace.autoplay = true;
    peerFace.playsInline = true;
    peerFace.width = "400";
    peerFace.height = "400";
    peerFace.srcObject = data.stream;

    peerStream.appendChild(peerFace);



}