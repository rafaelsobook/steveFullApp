const { Engine, MeshBuilder, Vector3, PointerEventTypes } = BABYLON
import { emitAction, emitMove, emitStop, getMyDetail, initializeSocket } from './socket/socketLogic.js';
import createScene, { getPlayersInScene } from "./scenes/createScene.js";
const log = console.log;

let state = 'LOBBY' // LOADING, LOBBY, GAME
let canPress = true
initializeSocket()


export async function main(){
  const engine = new Engine(document.querySelector("canvas"))
  const {scene} = await createScene(engine)

  engine.runRenderLoop(() => {
    scene.render()
  })
  window.addEventListener('resize', e => engine.resize())
  window.addEventListener("keydown", e => {
    const keypressed = e.key.toLowerCase()
    let myDetail = getMyDetail()
    let myCharacterInScene = getPlayersInScene().find(plScene => plScene._id === myDetail._id)
    if(!myCharacterInScene) return log("my Character mesh not found")
    
    let currentPos = myCharacterInScene.mainBody.getAbsolutePosition();
    let movementName
    
    switch(keypressed){
      case "w":
        movementName = "forward"
      break
      case "a":
        movementName = "left"
      break
      case "d":
        movementName = "right"
      break
      case "s":
        movementName = "backward"
      break
      default:
        movementName = undefined
      break
    }
    if(!movementName) return log("not pressing wasd")
    if(!canPress) return log("already using the same key")
    // const rotY = myCharacterInScene.mainBody.getRotationQuaternion(Space.WORLD)
    if(movementName === myCharacterInScene._movementName) return log("already moving same direction")
    if(myCharacterInScene._actionName !== undefined) return console.warn("has actions ")
    emitMove({
      _id: myDetail._id, 
      movementName,
      loc: {x: currentPos.x, y: currentPos.y,z: currentPos.z}, 
      dir: {x: currentPos.x, y: currentPos.y,z: currentPos.z}, 
    })
  })
 
  window.addEventListener("keyup", e => {
    const keypressed = e.key.toLowerCase()
    let movementName
    switch(keypressed){
      case "w":
        movementName = "forward"
      break
      case "a":
        movementName = "left"
      break
      case "d":
        movementName = "right"
      break
      case "s":
        movementName = "backward"
      break
      default:
        movementName = undefined
      break
    }
    let myDetail = getMyDetail()
    if(keypressed === " ") return emitAction({_id: myDetail._id, actionName: "jump"})
    if(!movementName) return 

    
    let myCharacterInScene = getPlayersInScene().find(plScene => plScene._id === myDetail._id)
    if(!myCharacterInScene) return log("my Character mesh not found")
    canPress = true
    let currentPos = myCharacterInScene.mainBody.getAbsolutePosition();
    emitStop({
      _id: myDetail._id, 
      movementName,
      loc: {x: currentPos.x, y: currentPos.y,z: currentPos.z}, 
      dir: {x: currentPos.x, y: currentPos.y,z: currentPos.z} 
    })
  })
  
}

export function getState(){
  return state
}
export function setState(_newState){
  state = _newState
}

