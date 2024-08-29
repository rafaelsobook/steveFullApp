import { getState, main, setState } from "../index.js"
import { blendAnimv2, checkPlayers, getPlayersInScene, getScene, playerDispose, rotateAnim } from "../scenes/createScene.js"

const { MeshBuilder, Vector3, Space } = BABYLON
const log = console.log
const listElement = document.querySelector(".room-lists")

let socket
let myDetail //_id, name, socketId, loc, roomNum
let playersInServer = []

listElement.addEventListener("click", e => {
  const roomNumber = e.target.className.split(" ")[1]
  if (!roomNumber) return
  if (!socket) return log('socket not connected')
  socket.emit('joinRoom', {
    name: `samplename${Math.random().toLocaleString().split(".")[1]}`,
    roomNumber
  })
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
    log(`${newPlayer.name} has joined the room`)
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

  // movements
  socket.on("a-player-moved", playersInRoom => {
    // log(playersInRoom)
    playersInRoom.forEach(data => {
      const playersInScene = getPlayersInScene()
      const playerThatMoved = playersInScene.find(pl => pl._id === data._id)
      log(data)
      if (!playerThatMoved) return

      if (playerThatMoved) {
        const { dir, movement } = data
        const loc = playerThatMoved.mainBody.position
        const plMove = playerThatMoved.movement
        if(movement.moveX !== plMove.moveX || movement.moveZ !== plMove.moveZ){
            
          rotateAnim({x:movement.moveX, y:loc.y, z: movement.moveZ}, playerThatMoved.root, playerThatMoved.rotationAnimation, getScene(), 2)  
        }
        playerThatMoved.dir = dir
        playerThatMoved.movement = movement
        playerThatMoved._moving = true
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
function updateAllPlayers(_newPlayers) {
  playersInServer = _newPlayers
  log(playersInServer)
}
export function getMyDetail() {
  return myDetail
}
export function getAllPlayersInSocket() {
  return playersInServer
}