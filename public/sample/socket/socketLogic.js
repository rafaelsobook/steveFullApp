import {createBullet, createShape, importCustomModel, parentAMesh, setMeshesVisibility } from "../creations.js"
// import { getInitialPlayer } from "../dropdown.js"
import { attachToGizmoArray, changeGizmo, getGizmo } from "../guitool/gizmos.js"
import { getState, main, setState } from "../index.js"
import { createAggregate } from "../physics/aggregates.js"
import { blendAnimv2, checkPlayers, checkSceneModels, getPlayersInScene, getScene, getThingsInScene, playerDispose, rotateAnim } from "../scenes/createScene.js"
import { v4 as uuidv4 } from 'https://jspm.dev/uuid';

const { MeshBuilder, Vector3, Space, Quaternion, GizmoManager } = BABYLON
const log = console.log

var socket
let myDetail //_id, name, socketId, loc, roomNum
let playersInServer = []
let importedModelsInServer = []
// Get the full URL
const urlParams = new URLSearchParams(window.location.search);
const roomNumber = urlParams.get('room');
let userStream;
// let muteFlag = false;
let mediaType = "audio"; // can be "camera", "screen", or "audio"
let userVideo;
let peerVideos = []
let creator = false;
let rtcPeerConnection;

export function getSocket() {
  return socket
}
// Function to extract the authToken from cookies
function getCookie(name) {
  const cookieString = document.cookie;
  console.log(cookieString)
  const cookies = cookieString.split('; ');
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    
    if (key === name) {
      console.log(value)
      return value;
    }
  }
  console.log("cookie not found")
  // window.location.href = "/login/index.html"
  return null;
}

export function initializeRoom() {
  console.log("initializing socket and getting the cookie")
  // socket = io("https://steveapptcp.onrender.com/")
  const authToken = getCookie('authToken');
  if (!authToken) {
    console.error('No auth token found');
    window.location.href = '/login/index.html';
    return;
  }
  
  socket = io('/', {
    auth: {
      authToken: authToken,
    },
  });

  
  // socket.on('room-size', roomLength => {
  //   for (var i = 0; i < roomLength; i++) {
  //     const button = document.createElement("button")
  //     button.className = `room-btn ${i + 1}`
  //     switch (i + 1) {
  //       case 1:
  //           button.innerHTML = "Main"
  //           break;
  //       case 2:
  //           button.innerHTML = "Virtual World Museum (Test)"
  //           break;
  //       case 3:
  //           button.innerHTML = "Jordan's Memories"
  //           break;
  //       default:
  //           button.innerHTML = `room ${i + 1}`
  //           break;
  //     }
  //     listElement.append(button)
  //   }
  // })
  socket.on("player-joined", data => {
    const { newPlayer, allPlayers, sceneDescription } = data

    updateAllPlayers(allPlayers)
    updateImportedModels(sceneDescription)
  })
  socket.on('who-am-i', detail => {
    myDetail = detail
    const state = getState()
    if (state === "GAME") return log("Already On Game")
    if (state === "LOBBY") {
      // listElement.style.display = "none"
      setState("LOADING")
      main()
    }
  })
  socket.on('scene-updated', sceneDescriptionList => {
    const scene = getScene()
    if(!scene) return log("scene not ready")
    sceneDescriptionList.forEach( desc => {
      const modelAlreadyHere = importedModelsInServer.find(model => model._id === desc._id)
      if(modelAlreadyHere) {
        return checkSceneModels()
      }
      importedModelsInServer.push(desc)
      checkSceneModels()
    })

  })
  socket.on("update-player", newPlayerDetail => {
    const player = getPlayersInScene().find(pl => pl._id === newPlayerDetail._id)
    if(!player) return log("updating player not on scene")
    log(`updating ${newPlayerDetail._id}`)
    player.immersiveState = newPlayerDetail.immersiveState
    player.rightIKActive = newPlayerDetail.rightIKActive
  })
  socket.on("toggle-visibility", descriptions => {
    // log(getThingsInScene())
    // log(descriptions)

    descriptions.forEach(desc => {        
        const itemOnScene = getThingsInScene().find(itm =>itm._id === desc._id)
        if(itemOnScene){
            if(desc.isVisible !== undefined){
                setMeshesVisibility([itemOnScene.mesh], desc.isVisible)
            }
        }
    })    
  })
  socket.on("moved-object", sceneDescriptions => {
    const scene = getScene()
    if(!scene) return log("scene not ready")

    sceneDescriptions.forEach(modelData => {      
      const sceneModel = scene.getMeshById(modelData._id)
      if(!sceneModel) return
      sceneModel.position.x = modelData.pos.x
      sceneModel.position.y = modelData.pos.y
      sceneModel.position.z = modelData.pos.z
      // log(modelData)
      // log(modelData.name, modelData.rotq)
      if(sceneModel.rotationQuaternion && modelData.rotQ){
        // log(sceneModel.rotationQuaternion)
        // log(`${sceneModel.name} updating rotq`)
        sceneModel.rotationQuaternion.x = modelData.rotQ.x
        sceneModel.rotationQuaternion.y = modelData.rotQ.y
        sceneModel.rotationQuaternion.z = modelData.rotQ.z
        sceneModel.rotationQuaternion.w = modelData.rotQ.w
      }
      const description = importedModelsInServer.find(desc => desc._id === modelData._id)
      if(description){
        description.pos = modelData.pos
        description.rotQ = modelData.rotQ
      }
    })
  })
  socket.on("trigger-bullet", data => {
    const {pos,dir,resulting_action} = data
    const {model, mass, force, collisioncallback } = resulting_action
    const bullet = createShape({ diameter: model.diameter}, {x:pos.x, y:pos.y, z: pos.z}, "name", model.meshType)
   

    const agg = createAggregate(bullet, {mass}, model.meshType)
    const vel = new Vector3(dir.x*force, dir.y*force, dir.z*force)
    // log(vel)
    agg.body.applyImpulse(vel, bullet.getAbsolutePosition())
    if(collisioncallback){
      agg.body.setCollisionCallbackEnabled(true)   
      agg.body.getCollisionObservable().add( e => {
  
          if(e.type === BABYLON.PhysicsEventType.COLLISION_STARTED){
              const hitMesh = e.collidedAgainst.transformNode
              // agg.body.setLinearDamping(1)
              agg.body.setCollisionCallbackEnabled(false)
              // log(agg.shape.material.restitution)
              agg.shape.material.restitution = 0
              agg.body.setLinearDamping(5)
              agg.body.applyImpulse(new Vector3(0,-5,0), bullet.getAbsolutePosition())
              
              if(hitMesh.name.includes("ground")){
                  // agg.body.setLinearDamping(14)
                  // agg.body.setCollisionCallbackEnabled(false)
              }
              eval(collisioncallback.action)
              setTimeout(() => {
                  bullet.dispose()
                  agg.body.dispose()
              }, 2500)
          }
      })
    }

    // createBullet(data.pos, data.dir)
  })
  // VR player move hands
  socket.on("player-moved-hands", playersInRoom => {
    // log(playersInRoom)
    playersInRoom.forEach(data => {
      const playersInScene = getPlayersInScene()
      const player = playersInScene.find(pl => pl._id === data._id)
      if (player) {
  
        if(player._id !== getMyDetail()._id){ // only for others because you are already moving your hands real time
          const { wristPos , wristQuat, headDirection, fingerCoord} = data
      
          if(!wristPos || !wristQuat) return
          
          setMeshesVisibility([player.rHandMesh, player.lHandMesh], true)
          // updating other player hand pos
          player.lHand.position.x = wristPos.left.x
          player.lHand.position.y = wristPos.left.y
          player.lHand.position.z = wristPos.left.z

          player.rHand.position.x = wristPos.right.x
          player.rHand.position.y = wristPos.right.y
          player.rHand.position.z = wristPos.right.z

          // updating other player hand rot quat
          player.lHand.rotationQuaternion.x = wristQuat.left.x
          player.lHand.rotationQuaternion.y = wristQuat.left.y
          player.lHand.rotationQuaternion.z = wristQuat.left.z
          player.lHand.rotationQuaternion.w = wristQuat.left.w

          player.rHand.rotationQuaternion.x = wristQuat.right.x
          player.rHand.rotationQuaternion.y = wristQuat.right.y
          player.rHand.rotationQuaternion.z = wristQuat.right.z
          player.rHand.rotationQuaternion.w = wristQuat.right.w

          if(headDirection) {
            // log(headDirection)
            player.headDirection = headDirection
            // player.neckNode.lookAt(new Vector3(headDirection.x, headDirection.y, headDirection.z), Math.PI,Math.PI - Math.PI/8,0, Space.WORLD)
          }
          // finger joint movements
          if(fingerCoord && fingerCoord.length){
            fingerCoord.forEach(fingerData => {
              let bone
              if(fingerData.name.includes("left")){
                bone = player.lHandBones.find(bone => bone.name === fingerData.name)
              }else{
                bone = player.rHandBones.find(bone => bone.name === fingerData.name)
              }
              if(!bone) return 
              const boneNode = bone.getTransformNode()
              boneNode.setAbsolutePosition(new Vector3(fingerData.x,fingerData.y,fingerData.z))
            })
          }
          
        }
      }
    })
  })
  socket.on("hide-or-show-hands", playersInRoom => {
    playersInRoom.forEach(data => {
      const playersInScene = getPlayersInScene()
      const player = playersInScene.find(pl => pl._id === data._id)
      if (player) setMeshesVisibility([player.rHandMesh, player.lHandMesh], data.vrHandsVisible)
        
    })
  })
  // movements
  socket.on("a-player-moved", playersInRoom => {
    // log(playersInRoom)
    playersInRoom.forEach(data => {
      const playersInScene = getPlayersInScene()
      const playerThatMoved = playersInScene.find(pl => pl._id === data._id)
      if (playerThatMoved) {
        const { camPosInWorld, dir, movement, wristPos, quat, controller } = data
        // log(camPosInWorld)
        if(movement.moveX == 0 && movement.moveZ===0 && controller !=="vr-hands") return
        const loc = playerThatMoved.mainBody.position
        const plMove = playerThatMoved.movement

        playerThatMoved.dir = dir
        playerThatMoved.movement = movement
        playerThatMoved._moving = data._moving
        playerThatMoved.rootQuat = quat
        playerThatMoved.controller = controller
        playerThatMoved.camPosInWorld = camPosInWorld
      }
    })
  })
  socket.on("player-stopped", data => {
 
    const playersInScene = getPlayersInScene()
    const plThatStopped = playersInScene.find(pl => pl._id === data._id)
    if (plThatStopped) {
      // log("player stopped !")
      plThatStopped.mainBody.position.x = data.loc.x
      plThatStopped.mainBody.position.z = data.loc.z
      plThatStopped.mainBody.position.y = data.loc.y
      plThatStopped.anims[1].stop()
      blendAnimv2(plThatStopped, plThatStopped.anims[0], plThatStopped.anims, true, false, plThatStopped.anims[1])
      plThatStopped.dir = data.dir
      plThatStopped.movement = data.movement
      plThatStopped._moving = false
      // if (!data.movement.moveX && !data.movement.moveZ) plThatStopped._moving = false
    }
  })
  socket.on("player-emitted-action", data => {
    const playersInScene = getPlayersInScene()
    const player = playersInScene.find(pl => pl._id === data._id)
    if (player) {
      if (player._actionName === data.actionName) return log("still doing the same action")
      player._actionName = data.actionName
      switch (player._actionName) {
        case "jump": 
          player.playerAgg.body.applyImpulse(new Vector3(0,2500,0), player.mainBody.getAbsolutePosition())
          blendAnimv2(player, player.anims[2], player.anims, false, {
            lastAnimation: player.anims[2],
            run: () => {
              // player.playerAgg.body.setLinearDamping(10)
              if(!player.anims[1].isPlaying) blendAnimv2(player, player.anims[0], player.anims, true)
            }
          })
        break;
      }

    }
  })
  socket.on("remove-action", data => {
    const playersInScene = getPlayersInScene()
    const player = playersInScene.find(pl => pl._id === data._id)
    if (player) {
      if (player._actionName === data.actionName) {
        player._actionName = undefined
      }
    }
  })
  socket.on('player-dispose', playerDetail => {
    const scene = getScene()
    playerDispose(playerDetail)
    scene.meshes.forEach(mesh => {
      if(mesh.name.includes(playerDetail._id)){
        log(`dispose this ${mesh.name}`)
        log(`this mesh parent ${mesh.parent}`)
      }
    })
  })

  if (!roomNumber) return console.log('roomNumber error ', roomNumber)
  if (!socket) return console.log('socket not connected')
  const user = {
    name: "Belle",
    // avatarName: "Belle",
    avatarUrl: "https://models.readyplayer.me/661ddfc815d99b54c430940b.glb"
  }

  socket.emit('joinRoom', {
    name: user.name,
    roomNumber,
    avatarUrl: user.avatarUrl
  })

//////////////// Video Chat - Start //////////////////////

// let socket = io('');


  const id = uuidv4();

  let iceServers = {
    iceServers: [
      { urls: "stun:stun.services.mozilla.com" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };

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


  socket.on("created", async function (d) {
    const {mediaType, data} = d
    creator = true;
    await getAndSetUserMedia(mediaType, data);
  }); 

  socket.on("joined", async function (d) {
    const {mediaType, data} = d
    creator = false;
    await getAndSetUserMedia(mediaType, data);
  });

  async function getAndSetUserMedia(mediaType, data) {
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
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevice = devices.find(device => device.kind === 'videoinput');
        
        if (!videoDevice) {
          alert("No cameras found!");
          return;
        }

        mediaPromise = navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 500, height: 500, deviceId: { exact:videoDevice.deviceId } }
        });
    }

    mediaPromise
      .then(setUpStream)
      .catch(handleMediaError);
  }

  function setUpCamera(scene, stream, _id, pos){

    const engine = getScene().getEngine()

    // TODO check if video tag exists before trying to create it
    // Create the video element
    const video = document.createElement("video");
    video.autoplay = false;
    video.playsInline = true;

    video.id = _id
    video.srcObject = stream;
    video.onloadedmetadata = function (e) {
      video.play();
    };

    // Append the video element to the body
    document.body.appendChild(video);
    console.log("Adding HTML video element");

    // This is where you create and manipulate meshes
    var TV = BABYLON.MeshBuilder.CreatePlane("myPlane", {width: 1.7, height: 1}, scene);
    // TV.rotate(BABYLON.Axis.Z, Math.PI, BABYLON.Space.WORLD);
    TV.position = new BABYLON.Vector3(pos.x,pos.y, pos.z)
    TV.rotate(BABYLON.Axis.Z, Math.PI, BABYLON.Space.WORLD);
    TV.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.WORLD);
    TV.actionManager = new BABYLON.ActionManager(scene);
    attachToGizmoArray(TV)


    // Video material
    const videoMat = new BABYLON.StandardMaterial("textVid", scene);
    // var video = document.querySelector('video');
    var videoTexture = new BABYLON.VideoTexture('video', video, scene, true, true);

    videoMat.backFaceCulling = false;
    videoMat.diffuseTexture = videoTexture;
    videoMat.emissiveColor = BABYLON.Color3.White();
    TV.material = videoMat;
    var htmlVideo = videoTexture.video;

    // video.srcObject = stream;
    video.addEventListener('loadedmetadata',function() {
        TV.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger,
            function(event) {
                htmlVideo.play();
            })
        );
    });
    return video
  }
  function setUpStream(stream) {
    const id = uuidv4();
    userStream = stream;

    userVideo = setUpCamera(
      scene, 
      stream, 
      id, // Need to make random
      {x:4,y:1,z:4}  
    )

    socket.emit("ready", roomNumber);
  }

  function handleMediaError(err) {
    console.error(err);
    alert("Couldn't access media: " + err.message);
  }

  socket.on("full", function () {
    alert("Room is Full, Can't Join");
  });

  socket.on("ready", function () {
    // if (creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    userStream.getTracks().forEach(track => rtcPeerConnection.addTrack(track, userStream));

    rtcPeerConnection
      .createOffer()
      .then((offer) => {
        rtcPeerConnection.setLocalDescription(offer);
        socket.emit("offer", offer, roomNumber);
      })
      .catch((error) => {
        console.log(error);
      });
    // }
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
          socket.emit("answer", answer, roomNumber);
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
    // if (peerVideo.srcObject) {
    //   peerVideo.srcObject.getTracks().forEach(track => track.stop());
    // }

    if (rtcPeerConnection) {
      rtcPeerConnection.ontrack = null;
      rtcPeerConnection.onicecandidate = null;
      rtcPeerConnection.close();
      rtcPeerConnection = null;
    }
  });

  function OnIceCandidateFunction(event) {
    if (event.candidate) {
      socket.emit("candidate", event.candidate, roomNumber);
    }
  }

  function OnTrackFunction(event) {
    const peer = setUpCamera(
      scene,
      event.streams[0],
      `${Math.random()}`,
      {x: 1 + Math.random()*2, y:2 + Math.random()*2, z:1}
    )
    peerVideos.push(peer)

    // peerVideo.srcObject = event.streams[0];
    // peerVideo.onloadedmetadata = function (e) {
    //   peerVideo.play();
    // };
  }
/////////////////////  Video Chat - End //////////////////////
}
export function emitVideoJoin(type) {  

  if (roomNumber == "") {
    alert("room is expected as a parameter in the url");
  } else {
    mediaType = type;
    socket.emit("join", roomNumber);
    console.log("Join Room")
  }
}
export function emitVideoStop() {  
  socket.emit("leave", roomNumber);
  
  if (userVideo.srcObject) {
    userVideo.srcObject.getTracks().forEach(track => track.stop());
  }
  peerVideos.forEach(peerVideo => {
    if (peerVideo.srcObject) {
      peerVideo.srcObject.getTracks().forEach(track => track.stop());
    }
  })

  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
};
export function emitAudioJoin(type, data) {
  if (roomNumber == "") {
    alert("room is expected as a parameter in the url");
  } else {
    mediaType = type;
    socket.emit("join", {roomNumber, mediaType:type, data});
    console.log("Join Room")
  }
}
export function emitAudioStop(type, data) {  
  socket.emit("leave", roomNumber);
  
  if (userVideo.srcObject) {
    userVideo.srcObject.getTracks().forEach(track => track.stop());
  }
  peerVideos.forEach(peerVideo => {
    if (peerVideo.srcObject) {
      peerVideo.srcObject.getTracks().forEach(track => track.stop());
    }
  })

  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
};

// Movement emits
export function emitMove(movementDetail) {

  if (!socket) return log('socket is not yet ready')

  // log(movementDetail.loc)
  socket.emit('emit-move', movementDetail)
}

export function emitStop(movementDetail) {
  if (!socket) return log('socket is not yet ready')
  // log(movementDetail.loc)
  socket.emit('emit-stopped', movementDetail)
}
export function emitAction(actionDetail) {
  if (!socket) return log("socket not ready")
  socket.emit("emit-action", actionDetail)
}
// tools
function updateAllPlayers(_newPlayers, _newModels) {
  playersInServer = _newPlayers
  checkPlayers()
  // importedModelsInServer = _newModels
  // log(playersInServer)
}
function updateImportedModels(_newModels) {
  importedModelsInServer = _newModels
  checkSceneModels()
}
export function getMyDetail() {  
  return myDetail
}
export function getAllPlayersInSocket() {
  return playersInServer
}
export function getAllImportedModelsInSocket(){
  return importedModelsInServer
}


function fetchVideoAndPlay(videoElement, videoUrl, cb) {
  fetch(videoUrl)
  .then(response => response.blob())
  .then(blob => {
    videoElement.src = blob;
    // return videoElement.play();

    if(cb) cb()
  })
  .then(_ => {
    // Video playback started ;)
  })
  .catch(e => {
    // Video playback failed ;(
      log(e)
  })
}