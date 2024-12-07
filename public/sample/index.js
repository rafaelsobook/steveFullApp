const { Engine, MeshBuilder, Vector3, PointerEventTypes } = BABYLON
import { getMyDetail, initializeRoom } from './socket/socketLogic.js';
import {createScene, getPlayersInScene, getScene } from "./scenes/createScene.js";
const log = console.log;

let state = 'LOBBY' // LOADING, LOBBY, GAME
let canPress = true

initializeRoom()
// initDropDown()



export async function main() {
  const engine = new Engine(document.querySelector("canvas"))

  const { scene } = await createScene(engine)

  engine.runRenderLoop(() => {
    scene.render()
  })
  window.addEventListener('resize', e => engine.resize())
}

export function getCharacter() {
  if(!getScene()) return false
  let myDetail = getMyDetail()
  if(!myDetail) return false
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

