import { createRefbx } from "../creations.js"
import { getCharacter } from "../index.js"
import { emitAction, emitMove, emitStop, getMyDetail } from "../socket/socketLogic.js"

const {Vector3} = BABYLON
const log = console.log


let movement = { moveX: 0, moveZ: 0 }
let camDir
let cPos
let tPos

export function initKeyControls(scene) {
    
    const refbx = createRefbx(scene)

    window.addEventListener("keydown", e => {
        const cam = scene.getCameraByName("cam")
        const keypressed = e.key.toLowerCase()

        let willMove = false
        let myCharacterInScene = getCharacter()
        if (!myCharacterInScene) return log(myCharacterInScene)
        camDir = cam.getForwardRay().direction.clone()
        camDir.y = refbx.position.y
        switch (keypressed) {
            case "w":
            case "arrowup":
                movement.moveZ = 1
                willMove = true
                break
            case "a":
            case "arrowleft":
                movement.moveX = -1
                willMove = true
                break
            case "d":
            case "arrowright":
                movement.moveX = 1
                willMove = true
                break
            case "s":
            case "arrowdown":
                movement.moveZ = -1
                willMove = true
                break
        }
        if(!willMove) return

        cPos = myCharacterInScene.mainBody.position
        tPos = { x: cPos.x + camDir.x, y: cPos.y, z: cPos.z + camDir.z }
        
        if(movement.moveZ === 1) refbx.lookAt(camDir,0,0,0)
        if(movement.moveX === 1) refbx.lookAt(camDir,Math.PI/2,0,0)
        if(movement.moveX === -1) refbx.lookAt(camDir,-Math.PI/2,0,0)
        if(movement.moveZ === 1 && movement.moveX === 1) refbx.lookAt(camDir,Math.PI/2 - Math.PI/4,0,0)
        if(movement.moveZ === 1 && movement.moveX === -1) refbx.lookAt(camDir,-Math.PI/2 + Math.PI/4,0,0)
        
        if(movement.moveZ === -1) refbx.lookAt(camDir,Math.PI,0,0)
        if(movement.moveZ === -1 && movement.moveX === 1) refbx.lookAt(camDir,Math.PI - Math.PI/4,0,0)
        if(movement.moveZ === -1 && movement.moveX === -1) refbx.lookAt(camDir,-Math.PI + Math.PI/4,0,0)
        
        
        // const refBxFrontPosition = Vector3.TransformCoordinates(Vector3.Forward(), refbx.computeWorldMatrix(true))
        const _quat = refbx.rotationQuaternion

        emitMove({
            _id: myCharacterInScene._id,
            movement,
            direction: tPos,
            // direction: {x: camDir.x, y: 1, z: camDir.z},
            controllerType: 'key',
            quat: {x:_quat.x, y:_quat.y, z: _quat.z, w: _quat.w}
        })
    })
    window.addEventListener("keyup", e => {
        const cam = scene.getCameraByName("cam")
        const keypressed = e.key.toLowerCase()
        let willStop = false
        let myCharacterInScene = getCharacter()
        if (!myCharacterInScene) return
        switch (keypressed) {
            case "w":
            case "arrowup":
                movement.moveZ = 0
                willStop = true
                break
            case "a":
            case "arrowleft":
                movement.moveX = 0
                willStop = true
                break
            case "d":
            case "arrowright":
                movement.moveX = 0
                willStop = true
                break
            case "s":
            case "arrowdown":
                movement.moveZ = 0
                willStop = true
                break
            case " ":
                if(myCharacterInScene._actionName === "jump") return
                emitAction({ _id: myCharacterInScene._id, actionName: "jump" })
                break
        }
        if(!willStop) return
        camDir = cam.getForwardRay().direction
        cPos = myCharacterInScene.mainBody.position
        tPos = { x: cPos.x + camDir.x, y: cPos.y, z: cPos.z + camDir.z }


        emitStop({
            _id: myCharacterInScene._id,
            movement,
            loc: {x: cPos.x, y: cPos.y, z: cPos.z},
            direction: tPos,
            controllerType: 'key'
        })
    })
}
