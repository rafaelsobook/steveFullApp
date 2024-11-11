import {createBullet, importCustomModel, parentAMesh, setMeshesVisibility } from "../creations.js"
import { getInitialPlayer } from "../dropdown.js"
import { attachToGizmoArray, changeGizmo, getGizmo } from "../guitool/gizmos.js"
import { getState, main, setState } from "../index.js"
import { blendAnimv2, checkPlayers, checkSceneModels, getPlayersInScene, getScene, getThingsInScene, playerDispose, rotateAnim } from "../scenes/createScene.js"


const { MeshBuilder, Vector3, Space, Quaternion, GizmoManager } = BABYLON
const log = console.log
const listElement = document.querySelector(".room-lists");

var socket
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
  document.querySelectorAll(".dropdown").forEach(elem => elem.style.display = "none")
  const videoLobbyelem = document.getElementById("video-chat-lobby")
  setTimeout(() => {
    videoLobbyelem.style.pointerEvents = "none"
    videoLobbyelem.style.display = "none"
  }, 7000)
})

export function getSocket() {
  return socket
}

export function initializeSocket() {
  // socket = io("https://steveapptcp.onrender.com/")
  socket = io("/")

  socket.on('room-size', roomLength => {
    for (var i = 0; i < roomLength; i++) {
      const button = document.createElement("button")
      button.className = `room-btn ${i + 1}`
      switch (i + 1) {
        case 1:
            button.innerHTML = "Main"
            break;
        case 2:
            button.innerHTML = "Virtual World Museum (Test)"
            break;
        case 3:
            button.innerHTML = "Jordan's Memories"
            break;
        default:
            button.innerHTML = `room ${i + 1}`
            break;
      }
      listElement.append(button)
    }
  })
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
      listElement.style.display = "none"
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
  socket.on("toggle-visibility", descriptions => {
    // log(getThingsInScene())
    // log(descriptions)
    descriptions.forEach(desc => {        
        const itemOnScene = getThingsInScene().find(itm =>itm._id === desc._id)
        if(itemOnScene){
            if(desc.isVisible !== undefined){
                itemOnScene.MeshBuilder
                setMeshesVisibility(itemOnScene.mesh.getChildren(), desc.isVisible)
            }
            // log(desc.name, desc.isVisible)
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
      const description = importedModelsInServer.find(desc => desc._id === modelData._id)
      if(description){
        description.pos = modelData.pos
      }
    })
  })
  socket.on("trigger-bullet", data => {
    createBullet(data.pos, data.dir)
  })
  // VR player move hands
  socket.on("player-moved-hands", playersInRoom => {
    // log(playersInRoom)
    playersInRoom.forEach(data => {
      const playersInScene = getPlayersInScene()
      const player = playersInScene.find(pl => pl._id === data._id)
      if (player) {
  
        if(player._id !== getMyDetail()._id){
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