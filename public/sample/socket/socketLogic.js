import { importCustomModel } from "../creations.js"
import { getInitialPlayer } from "../dropdown.js"
import { attachToGizmoArray, changeGizmo, getGizmo } from "../guitool/gizmos.js"
import { getState, main, setState } from "../index.js"
import { blendAnimv2, checkPlayers, getPlayersInScene, getScene, playerDispose, rotateAnim } from "../scenes/createScene.js"


const { MeshBuilder, Vector3, Space, Quaternion } = BABYLON
const log = console.log
const listElement = document.querySelector(".room-lists")

let socket
let myDetail //_id, name, socketId, loc, roomNum
let playersInServer = []
let importedModelsInServer = []

listElement.addEventListener("click", e => {

  const roomNumber = e.target.className.split(" ")[1]
  if (!roomNumber) return
  if (!socket) return log('socket not connected')
  const user = getInitialPlayer()
  if(!user) return console.warn("no selected avatar")

  socket.emit('joinRoom', {
    name: user.name,
    roomNumber,
    avatarUrl: user.avatarUrl
  })
  document.querySelector(".dropdown").style.display = "none"
})
export function getSocket() {
  return socket
}

export function initializeSocket() {
  if (socket !== undefined) return
  // socket = io("https://steveapptcp.onrender.com/")
  socket = io("/")

  socket.on('room-size', roomLength => {
    for (var i = 0; i < roomLength; i++) {
      const button = document.createElement("button")
      button.className = `room-btn ${i + 1}`
      button.innerHTML = `room ${i + 1}`
      listElement.append(button)
    }
  })
  socket.on("player-joined", data => {
    const { newPlayer, allPlayers } = data

    updateAllPlayers(allPlayers)  
    checkPlayers()
  })
  socket.on('who-am-i', detail => {
    myDetail = detail
    const state = getState()
    if (state === "GAME") return log("Already On Game")
    if (state === "LOBBY") {
      listElement.style.display = "none"
      setState("LOADING")
      main()
    }
  })
  socket.on('scene-updated', sceneDescriptionList => {
    const scene = getScene()
    if(!scene) return log("scene not ready")

    sceneDescriptionList.forEach( desc => {

      if(desc.type === "hlsurl"){
        const engine = scene.getEngine()
        // Create the video element
        var video = document.createElement("video");
        video.autoplay = false;
        video.playsInline = true;
        video.src = desc.url;
        video.id = desc._id
        
        console.log("Adding HTML video element");
        document.body.appendChild(video);
        // This is where you create and manipulate meshes
        var TV = BABYLON.MeshBuilder.CreatePlane("myPlane", {width: 1.7, height: 1}, scene);
        // TV.rotate(BABYLON.Axis.Z, Math.PI, BABYLON.Space.WORLD);
        TV.position = new Vector3(desc.pos.x,desc.pos.y, desc.pos.z)
        TV.rotate(BABYLON.Axis.Z, Math.PI, BABYLON.Space.WORLD);
        TV.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.WORLD);
        TV.actionManager = new BABYLON.ActionManager(scene);
        if(getGizmo()) {
          attachToGizmoArray(TV); 
          changeGizmo(false,false, true)
        }
    
        // Video material
        const videoMat = new BABYLON.StandardMaterial("textVid", scene);
        var video = document.querySelector('video');video.style.width = "100px"
        video.preload ="none"
        var videoTexture = new BABYLON.VideoTexture('video', video, scene, true, true);

        videoMat.backFaceCulling = false;
        videoMat.diffuseTexture = videoTexture;
        videoMat.emissiveColor = BABYLON.Color3.White();
        TV.material = videoMat;
        var htmlVideo = videoTexture.video;

        if (Hls.isSupported()) {
            var hls = new Hls();
            hls.loadSource(desc.url);
            hls.attachMedia(video);
            engine.hideLoadingUI();
            hls.on(Hls.Events.MANIFEST_PARSED,function() {
                TV.actionManager.registerAction(
                    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger,
                    function(event) {
                        htmlVideo.play();
                        changeGizmo(false, false, true)
                    })
                );
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = desc.url;
            engine.hideLoadingUI();
            video.addEventListener('loadedmetadata',function() {
                TV.actionManager.registerAction(
                    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger,
                    function(event) {
                        htmlVideo.play();
                        changeGizmo(false, false, true)
                    })
                );
            });
        }
      }
    
      if(desc.type === "primitive"){
        let model
        let error=false
        switch(desc.shape){
          case "box":
            model = MeshBuilder.CreateBox(desc.shape, { height: 2 }, scene)
          break
          case "cylinder":
            model = MeshBuilder.CreateCylinder(desc.shape, { diameter: 2 }, scene)
          break
          default:
            log("unsupported shape ", desc)
            error = true
          break
        }
        if(error) return
        const pos = desc.pos
        model.position = new Vector3(pos.x,pos.y,pos.z)
        // rotation implement here
      }
      if(desc.type === "remoteurl"){
        importCustomModel(desc.url).then( avatar => {        
          const Root = avatar.meshes[0]
          const pos = desc.pos
          Root.position = new Vector3(pos.x, pos.y, pos.z)
          // importedModelsInServer.push({...desc, body: Root})
          // lookAr direction here
        })
      }
    })

  })
  // VR player move hands
  socket.on("player-moved-hands", playersInRoom => {
    // log(playersInRoom)
    playersInRoom.forEach(data => {
      const playersInScene = getPlayersInScene()
      const player = playersInScene.find(pl => pl._id === data._id)
      if (player) {
        // player.leftHandControl.isVisible = true
        // player.rightHandControl.isVisible = true
        if(player._id !== getMyDetail()._id){
          const { wristPos , wristQuat, headDirection, fingerCoord} = data
          // log(wristPos, wristQuat)

          if(!wristPos || !wristQuat){
            // player.lHand.isVisible = false
            // player.rHand.isVisible = false
            return
          }

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
            log(headDirection)
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
  // movements
  socket.on("a-player-moved", playersInRoom => {
    // log(playersInRoom)
    playersInRoom.forEach(data => {
      const playersInScene = getPlayersInScene()
      const playerThatMoved = playersInScene.find(pl => pl._id === data._id)
      if (playerThatMoved) {
        const { dir, movement, wristPos, quat, controller } = data
        if(movement.moveX == 0 && movement.moveZ===0) return
        const loc = playerThatMoved.mainBody.position
        const plMove = playerThatMoved.movement
        if(movement.moveX == 0 && movement.moveZ===0) return
        if(movement.moveX !== plMove.moveX || movement.moveZ !== plMove.moveZ){
            
          rotateAnim({x:movement.moveX, y:loc.y, z: movement.moveZ}, playerThatMoved.root, playerThatMoved.rotationAnimation, getScene(), 2)  
        }
        playerThatMoved.dir = dir
        playerThatMoved.movement = movement
        playerThatMoved._moving = true
        playerThatMoved.rootQuat = quat
        playerThatMoved.controller = controller
        if(playerThatMoved._id !== getMyDetail()._id){
          // playerThatMoved.leftHandControl.position.x = wristPos.left.x
          // playerThatMoved.leftHandControl.position.y = wristPos.left.y
          // playerThatMoved.leftHandControl.position.z = wristPos.left.z

          // playerThatMoved.rightHandControl.position.x = wristPos.right.x
          // playerThatMoved.rightHandControl.position.y = wristPos.right.y
          // playerThatMoved.rightHandControl.position.z = wristPos.right.z


        }
      }
    })
  })
  socket.on("player-stopped", data => {
 
    const playersInScene = getPlayersInScene()
    const plThatStopped = playersInScene.find(pl => pl._id === data._id)
    if (plThatStopped) {
      plThatStopped.mainBody.position.x = data.loc.x
      plThatStopped.mainBody.position.z = data.loc.z
      blendAnimv2(plThatStopped, plThatStopped.anims[0], plThatStopped.anims, true)
      plThatStopped.dir = data.dir
      plThatStopped.movement = data.movement
      plThatStopped._moving = false

      if (!data.movement.moveX && !data.movement.moveZ) plThatStopped._moving = false
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
          log("someone jumped")
          // blendAnimv2(player, player.anims[2], player.anims, false, {
          //   lastAnimation:  player.anims[2],
          //   run: () => {
          //     blendAnimv2(player, player.anims[0], player.anims, false)
          //   }
          // })
          player.anims[1].stop()
          blendAnimv2(player, player.anims[2], player.anims, false)
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
    playerDispose(playerDetail)
  })

  // WEBRTC CONNECECTION
  socket.on("offer", offer => {
    let rtcPeerConnection= new RTCPeerConnection(iceServers)

    rtcPeerConnection.onicecandidate = function OnIceCandidateFunction(event){
      if(event.candidate){
        socket.emit('candidate', event.candidate, myDetail.roomNum)
      }
    }
    rtcPeerConnection.ontrack = function OnTrackFunction(event){
      const video = getVideo()
      video.srcObject = event.streams[0];
      video.onloadedmetadata= e => {
        video.play()
      }
    }
    rtcPeerConnection.setRemoteDescription(offer)
    rtcPeerConnection.createAnswer(
      function(answer){
        rtcPeerConnection.setLocalDescription(answer)
        socket.emit("answer", answer, myDetail.roomNum)
      },
      function(error){
        log(error)
      }
    )
  })
}


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
  log("emitting ", actionDetail.actionName)
  if (!socket) return log("socket not ready")
  socket.emit("emit-action", actionDetail)
}
// tools
function updateAllPlayers(_newPlayers, _newModels) {
  playersInServer = _newPlayers
  // importedModelsInServer = _newModels
  log(playersInServer)
}
export function getMyDetail() {
  return myDetail
}
export function getAllPlayersInSocket() {
  return playersInServer
}
export function getAllImportedModelsInSocket(){

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