import { importCustomModel } from "../creations.js"
import { getInitialPlayer } from "../dropdown.js"
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
        return
      }
      importCustomModel(desc.url).then( avatar => {
        
        const Root = avatar.meshes[0]
        const pos = desc.pos
        Root.position = new Vector3(pos.x, pos.y, pos.z)
        // importedModelsInServer.push({...desc, body: Root})
        // lookAr direction here
      })
    })

  })
  // VR player move hands
  socket.on("player-moved-hands", playersInRoom => {
    // log(playersInRoom)
    playersInRoom.forEach(data => {
      const playersInScene = getPlayersInScene()
      const player = playersInScene.find(pl => pl._id === data._id)
      if (player) {
        player.leftHandControl.isVisible = true
        player.rightHandControl.isVisible = true
        if(player._id !== getMyDetail()._id){
          const { wristPos , wristQuat, headDirection} = data
          // log(wristPos, wristQuat)

          if(!wristPos || !wristQuat){
            player.leftHandControl.isVisible = false
            player.rightHandControl.isVisible = false
            return
          }

          // updating other player hand pos
          player.leftHandControl.position.x = wristPos.left.x
          player.leftHandControl.position.y = wristPos.left.y
          player.leftHandControl.position.z = wristPos.left.z

          player.rightHandControl.position.x = wristPos.right.x
          player.rightHandControl.position.y = wristPos.right.y
          player.rightHandControl.position.z = wristPos.right.z

          // updating other player hand rot quat
          player.leftHandControl.rotationQuaternion.x = wristQuat.left.x
          player.leftHandControl.rotationQuaternion.y = wristQuat.left.y
          player.leftHandControl.rotationQuaternion.z = wristQuat.left.z
          player.leftHandControl.rotationQuaternion.w = wristQuat.left.w

          player.rightHandControl.rotationQuaternion.x = wristQuat.right.x
          player.rightHandControl.rotationQuaternion.y = wristQuat.right.y
          player.rightHandControl.rotationQuaternion.z = wristQuat.right.z
          player.rightHandControl.rotationQuaternion.w = wristQuat.right.w

          if(headDirection) {
            log(headDirection)
            player.headDirection = headDirection
            // player.neckNode.lookAt(new Vector3(headDirection.x, headDirection.y, headDirection.z), Math.PI,Math.PI - Math.PI/8,0, Space.WORLD)
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
        const { dir, movement, wristPos } = data
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

        if(playerThatMoved._id !== getMyDetail()._id){
          playerThatMoved.leftHandControl.position.x = wristPos.left.x
          playerThatMoved.leftHandControl.position.y = wristPos.left.y
          playerThatMoved.leftHandControl.position.z = wristPos.left.z

          playerThatMoved.rightHandControl.position.x = wristPos.right.x
          playerThatMoved.rightHandControl.position.y = wristPos.right.y
          playerThatMoved.rightHandControl.position.z = wristPos.right.z


        }
      }
    })
  })
  socket.on("player-stopped", data => {
    log(data)
    const playersInScene = getPlayersInScene()
    const plThatStopped = playersInScene.find(pl => pl._id === data._id)
    if (plThatStopped) {
      plThatStopped.mainBody.position.x = data.loc.x
      plThatStopped.mainBody.position.z = data.loc.z
      blendAnimv2(plThatStopped, plThatStopped.anims[0], plThatStopped.anims, true)
      plThatStopped.dir = data.dir
      plThatStopped.movement = data.movement
      plThatStopped._moving = false
      log(data)
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