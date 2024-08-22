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
    if(!roomNumber) return
    if(!socket) return log('socket not connected')
    socket.emit('joinRoom', {
        name: `samplename${Math.random().toLocaleString().split(".")[1]}`,
        roomNumber
    })
})
export function getSocket(){
    return socket
}

export function initializeSocket(){
  if (socket !== undefined) return
  // socket = io("https://steveapptcp.onrender.com/")
  socket = io("/")

  socket.on('room-size', roomLength => {
    for(var i=0;i<roomLength;i++){
        const button = document.createElement("button")
        button.className = `room-btn ${i+1}`
        button.innerHTML = `room ${i+1}`
        listElement.append(button)
    }
  })
  socket.on("player-joined", data => {
      const {newPlayer, allPlayers} = data
      updateAllPlayers(allPlayers)
      log(`${newPlayer.name} has joined the room`)
      checkPlayers()
  })
  socket.on('who-am-i', detail =>  {
    myDetail = detail
    const state = getState()
    if(state === "GAME") return log("Already On Game")
    if(state === "LOBBY"){
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
      if(playerThatMoved){
        
        if(data._movingForward || data._movingBackward || data._movingLeft || data._movingRight){
          const { loc, dir } = data    
          if(playerThatMoved._actionName === undefined){
            blendAnimv2(playerThatMoved, playerThatMoved.anims[1], playerThatMoved.anims, true)
          }
          const plPos = playerThatMoved.mainBody.position
          
          // const magnitude = Math.sqrt((plPos.x - loc.x)**2 + loc.z - plPos);
          // const normX = loc.x/magnitude
          // const normZ = loc.z/magnitude

          const diffX = loc.x - plPos.x
          const diffZ = loc.z - plPos.z
          const distance = Math.sqrt(diffX**2 + diffZ**2)
          // log("distance ", distance)

          // log(Date.now())
          // log("x:", plPos.x, "z:", plPos.z);
          // log("dirx:", dir.x, "dirz:", dir.z);
          // log("diffX:", diffX, "diffZ:", diffZ);
 
          const multX = diffX*10000
          const multZ = diffZ*10000
       
          // log("multX:", multX, "multZ:", multZ);

          const targX = plPos.x+multX
          const targZ = plPos.z+multZ
          // log(targX, targZ)


          let map = new Map()
          map.set("timestamp", Date.now())
          map.set("x", plPos.x)
          map.set("z", plPos.z)
          map.set("diffX", diffX)
          map.set("diffZ", diffZ)
          map.set("multX", multX)
          map.set("multZ",multZ)
          map.set("targX", targX)
          map.set("targZ", targZ)
      
          // log(JSON.stringify(Object.fromEntries(map)))
          
          if(playerThatMoved._movementName !== data._movementName){
            playerThatMoved._movementName = data._movementName
            rotateAnim({x:loc.x, y:plPos.y, z: loc.z}, playerThatMoved.mainBody, playerThatMoved.rotationAnimation, getScene(), 2)
            // playerThatMoved.mainBody.lookAt(new Vector3(loc.x,0,loc.z),0,0,0)
          }
          playerThatMoved.mainBody.lookAt(new Vector3(loc.x,0,loc.z),0,0,0);
          if(data._movingForward && playerThatMoved.mainBody.position.z < loc.z){
            // playerThatMoved.mainBody.lookAt(new Vector3(loc.x,0,loc.z),0,0,0);
            // rotateAnim({x:loc.x, y:plPos.y, z: loc.z}, playerThatMoved.mainBody, playerThatMoved.rotationAnimation, getScene(), 4)
            playerThatMoved.mainBody.position.z = loc.z   
          }
          if(data._movingBackward && playerThatMoved.mainBody.position.z > loc.z){
            // playerThatMoved.mainBody.lookAt(new Vector3(loc.x,0,loc.z),0,0,0);
            // rotateAnim({x:loc.x, y:plPos.y, z: loc.z}, playerThatMoved.mainBody, playerThatMoved.rotationAnimation, getScene(), 4)
            playerThatMoved.mainBody.position.z = loc.z   
          }
          if(data._movingLeft && playerThatMoved.mainBody.position.x > loc.x){
            // playerThatMoved.mainBody.lookAt(new Vector3(loc.x,0,loc.z),0,0,0);
            // rotateAnim({x:loc.x, y:plPos.y, z: loc.z}, playerThatMoved.mainBody, playerThatMoved.rotationAnimation, getScene(), 4)
            playerThatMoved.mainBody.position.x = loc.x
          }    
          if(data._movingRight && playerThatMoved.mainBody.position.x < loc.x){
            // rotateAnim({x:loc.x, y:plPos.y, z: loc.z}, playerThatMoved.mainBody, playerThatMoved.rotationAnimation, getScene(), 4)
            // playerThatMoved.mainBody.lookAt(new Vector3(loc.x,0,loc.z),0,0,0);
            playerThatMoved.mainBody.position.x = loc.x
          }  

          // if(data._movingForward && !playerThatMoved._movingForward){
          //   playerThatMoved._movingForward = true
          //   rotateAnim({x:loc.x, y:plPos.y, z: loc.z}, playerThatMoved.mainBody, playerThatMoved.rotationAnimation, getScene(), 4)
          // }
          // if(data._movingBackward && !playerThatMoved._movingBackward){
          //   playerThatMoved._movingBackward = true
          //   rotateAnim({x:loc.x, y:plPos.y, z: loc.z}, playerThatMoved.mainBody, playerThatMoved.rotationAnimation, getScene(), 4)
          // }
          // if(data._movingLeft && !playerThatMoved._movingLeft){
          //   playerThatMoved._movingLeft = true
          //   rotateAnim({x:loc.x, y:plPos.y, z: loc.z}, playerThatMoved.mainBody, playerThatMoved.rotationAnimation, getScene(), 4)
          // }
          // if(data._movingRight && !playerThatMoved._movingRight){
          //   playerThatMoved._movingRight = true
          //   rotateAnim({x:loc.x, y:plPos.y, z: loc.z}, playerThatMoved.mainBody, playerThatMoved.rotationAnimation, getScene(), 4)
          // }
        }
      }
    })
  })
  socket.on("player-stopped", data => {
      const playersInScene = getPlayersInScene()
      const plThatStopped = playersInScene.find(pl => pl._id === data._id)
      if(plThatStopped){
         
          blendAnimv2(plThatStopped, plThatStopped.anims[0], plThatStopped.anims, true)
          plThatStopped._movingForward = data._movingForward
          plThatStopped._movingBackward = data._movingBackward
          plThatStopped._movingLeft = data._movingLeft
          plThatStopped._movingRight = data._movingRight
          plThatStopped._movementName = undefined
          plThatStopped.canRotate = true
      }
  })
  socket.on("player-emitted-action", data => {
    const playersInScene = getPlayersInScene()
    const player = playersInScene.find(pl => pl._id === data._id)
    if(player){ 
      if(player._actionName === data.actionName) return log("still doing the same action")
      player._actionName = data.actionName  
      switch(player._actionName){
        case "jump":
          log("someone jumped")
          // blendAnimv2(player, player.anims[2], player.anims, false, {
          //   lastAnimation:  player.anims[2],
          //   run: () => {
          //     blendAnimv2(player, player.anims[0], player.anims, false)
          //   }
          // })
          blendAnimv2(player, player.anims[2], player.anims, false)
      break;
      }
        
    }
  })
  socket.on("remove-action", data => {
    const playersInScene = getPlayersInScene()
    const player = playersInScene.find(pl => pl._id === data._id)
    if(player){ 
      if(player._actionName === data.actionName) {
        player._actionName = undefined
      }        
    }
  })

  socket.on('player-dispose', playerDetail => {
    playerDispose(playerDetail)
  })
}

// Movement emits
export function emitMove(movementDetail){
  if(!socket) return log('socket is not yet ready')
  // log(movementDetail.loc)
  socket.emit('emit-move', movementDetail)
}

export function emitStop(movementDetail){
  if(!socket) return log('socket is not yet ready')
  // log(movementDetail.loc)
  socket.emit('emit-stopped', movementDetail)
}
export function emitAction(actionDetail){
  log("emitting ", actionDetail.actionName)
  if(!socket) return log("socket not ready")
  socket.emit("emit-action", actionDetail)
}
// tools
function updateAllPlayers(_newPlayers){
    playersInServer = _newPlayers
    log(playersInServer)
}
export function getMyDetail(){
  return myDetail
}
export function getAllPlayersInSocket(){
    return playersInServer
}