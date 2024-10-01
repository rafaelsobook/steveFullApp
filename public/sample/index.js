const { Engine, MeshBuilder, Vector3, PointerEventTypes } = BABYLON
import { emitAction, emitMove, emitStop, getMyDetail, initializeSocket } from './socket/socketLogic.js';
import {createScene, getPlayersInScene, getScene } from "./scenes/createScene.js";
import { initKeyControls } from './controllers/keycontroller.js';
import {getInitialPlayer, initDropDown} from './dropdown.js';
const log = console.log;

let state = 'LOBBY' // LOADING, LOBBY, GAME
let canPress = true

initializeSocket()
initDropDown()


export async function main() {
  const engine = new Engine(document.querySelector("canvas"))
  const initialPlayer = getInitialPlayer()
  if(!initialPlayer) return console.warn("no selected avatar")

  const { scene } = await createScene(engine)

  engine.runRenderLoop(() => {
    scene.render()
  })
  window.addEventListener('resize', e => engine.resize())

  initKeyControls(scene)
}

export function getCharacter() {
  if(!getScene()) return
  let myDetail = getMyDetail()
  if(!myDetail) return 
  let myCharacterInScene = getPlayersInScene().find(plScene => plScene._id === myDetail._id)
  if (!myCharacterInScene) return false
  return myCharacterInScene
}
export function getCanPress() {
  return canPress
}
export function getState() {
  return state
}
export function setState(_newState) {
  state = _newState
}

