let socket = io('');
let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinCameraButton = document.getElementById("joinCamera");
let joinScreenButton = document.getElementById("joinScreen");
let joinAudioButton = document.getElementById("joinAudio");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let audioOnlyLabel = document.getElementById("audio-only-label");
let roomInput = document.getElementById("roomName");
let cameraSelect = document.getElementById('cameraSelect');
let roomName;
let creator = false;
let rtcPeerConnection;
let userStream;

let divButtonGroup = document.getElementById("btn-group");
let muteButton = document.getElementById("muteButton");
let toggleMediaButton = document.getElementById("toggleMediaButton");
let leaveRoomButton = document.getElementById("leaveRoomButton");

let muteFlag = false;
let mediaType = "camera"; // can be "camera", "screen", or "audio"

let iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

joinCameraButton.addEventListener("click", () => joinRoom("camera"));
joinScreenButton.addEventListener("click", () => joinRoom("screen"));
joinAudioButton.addEventListener("click", () => joinRoom("audio"));

function joinRoom(type) {
  if (roomInput.value == "") {
    alert("Please enter a room name");
  } else {
    roomName = roomInput.value;
    mediaType = type;
    socket.emit("join", roomName);
  }
}

muteButton.addEventListener("click", function () {
  muteFlag = !muteFlag;
  if (muteFlag) {
    userStream.getAudioTracks()[0].enabled = false;
    muteButton.textContent = "Unmute";
  } else {
    userStream.getAudioTracks()[0].enabled = true;
    muteButton.textContent = "Mute";
  }
});

toggleMediaButton.addEventListener("click", function () {
  switch (mediaType) {
    case "camera":
      switchToScreenShare();
      break;
    case "screen":
      switchToAudioOnly();
      break;
    case "audio":
      switchToCamera();
      break;
  }
});

leaveRoomButton.addEventListener("click", function () {
  socket.emit("leave", roomName);
  divVideoChatLobby.style.display = "block";
  divButtonGroup.style.display = "none";
  divVideoChat.style.display = "none";

  if (userVideo.srcObject) {
    userVideo.srcObject.getTracks().forEach(track => track.stop());
  }
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks().forEach(track => track.stop());
  }

  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
});

function switchToScreenShare() {
  navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    .then(function(screenStream) {
      replaceMediaStream(screenStream);
      mediaType = "screen";
      toggleMediaButton.textContent = "Switch to Audio Only";
      audioOnlyLabel.style.display = "none";
    })
    .catch(handleMediaError);
}

function switchToAudioOnly() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(audioStream) {
      const simulatedStream = createSimulatedVideoStream(audioStream);
      replaceMediaStream(simulatedStream);
      mediaType = "audio";
      toggleMediaButton.textContent = "Switch to Camera";
      audioOnlyLabel.style.display = "block";
    })
    .catch(handleMediaError);
}

function switchToCamera() {
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: { width: 500, height: 500, deviceId: { exact: cameraSelect.value } }
  })
    .then(function(cameraStream) {
      replaceMediaStream(cameraStream);
      mediaType = "camera";
      toggleMediaButton.textContent = "Switch to Screen Share";
      audioOnlyLabel.style.display = "none";
    })
    .catch(handleMediaError);
}

function createSimulatedVideoStream(audioStream) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  // Create a simple animation
  function drawAnimation() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.fillText('Audio Only', canvas.width/2 - 70, canvas.height/2);

    const now = new Date();
    ctx.fillText(now.toLocaleTimeString(), canvas.width/2 - 70, canvas.height/2 + 40);

    requestAnimationFrame(drawAnimation);
  }
  drawAnimation();

  const videoStream = canvas.captureStream(30); // 30 FPS
  const audioTracks = audioStream.getAudioTracks();
  audioTracks.forEach(track => videoStream.addTrack(track));

  return videoStream;
}

function replaceMediaStream(newStream) {
  userStream.getTracks().forEach(track => track.stop());
  userStream = newStream;
  userVideo.srcObject = newStream;

  const audioTrack = newStream.getAudioTracks()[0];
  const videoTrack = newStream.getVideoTracks()[0];

  if (rtcPeerConnection) {
    const senders = rtcPeerConnection.getSenders();
    const audioSender = senders.find(sender => sender.track && sender.track.kind === "audio");
    const videoSender = senders.find(sender => sender.track && sender.track.kind === "video");

    if (audioSender) {
      audioSender.replaceTrack(audioTrack);
    } else {
      rtcPeerConnection.addTrack(audioTrack, newStream);
    }

    if (videoSender) {
      videoSender.replaceTrack(videoTrack);
    } else {
      rtcPeerConnection.addTrack(videoTrack, newStream);
    }
  }
}

socket.on("created", function () {
  creator = true;
  getAndSetUserMedia();
});

socket.on("joined", function () {
  creator = false;
  getAndSetUserMedia();
});

function getAndSetUserMedia() {
  let mediaPromise;

  switch (mediaType) {
    case "screen":
      mediaPromise = navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      break;
    case "audio":
      mediaPromise = navigator.mediaDevices.getUserMedia({ audio: true })
        .then(createSimulatedVideoStream);
      break;
    default: // camera
      mediaPromise = navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 500, height: 500, deviceId: { exact: cameraSelect.value } }
      });
  }

  mediaPromise
    .then(setUpStream)
    .catch(handleMediaError);
}

function setUpStream(stream) {
  userStream = stream;
  divVideoChatLobby.style.display = "none";
  divVideoChat.style.display = "block";
  divButtonGroup.style.display = "flex";

  userVideo.srcObject = stream;
  userVideo.onloadedmetadata = function (e) {
    userVideo.play();
  };

  if (mediaType === "audio") {
    audioOnlyLabel.style.display = "block";
  } else {
    audioOnlyLabel.style.display = "none";
  }

  socket.emit("ready", roomName);
}

function handleMediaError(err) {
  console.error(err);
  alert("Couldn't access media: " + err.message);
}

socket.on("full", function () {
  alert("Room is Full, Can't Join");
});

socket.on("ready", function () {
  if (creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    userStream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, userStream));

    rtcPeerConnection
      .createOffer()
      .then((offer) => {
        rtcPeerConnection.setLocalDescription(offer);
        socket.emit("offer", offer, roomName);
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

socket.on("candidate", function (candidate) {
  let icecandidate = new RTCIceCandidate(candidate);
  rtcPeerConnection.addIceCandidate(icecandidate);
});

socket.on("offer", function (offer) {
  if (!creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    userStream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, userStream));
    rtcPeerConnection.setRemoteDescription(offer);

    rtcPeerConnection
      .createAnswer()
      .then((answer) => {
        rtcPeerConnection.setLocalDescription(answer);
        socket.emit("answer", answer, roomName);
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

socket.on("answer", function (answer) {
  rtcPeerConnection.setRemoteDescription(answer);
});

socket.on("leave", function () {
  creator = true;
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks().forEach(track => track.stop());
  }

  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
});

function OnIceCandidateFunction(event) {
  if (event.candidate) {
    socket.emit("candidate", event.candidate, roomName);
  }
}

function OnTrackFunction(event) {
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = function (e) {
    peerVideo.play();
  };
}

function listCameras() {
  navigator.mediaDevices.enumerateDevices()
    .then(function(devices) {
      devices.forEach(function(device) {
        if (device.kind === 'videoinput') {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.text = device.label || `Camera ${cameraSelect.length + 1}`;
          cameraSelect.appendChild(option);
        }
      });
    })
    .catch(function(err) {
      console.error("Error accessing media devices.", err);
    });
}

window.addEventListener('load', listCameras);