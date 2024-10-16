import { getCharacter } from "../index.js"
import { emitAction, emitMove, emitStop, getMyDetail } from "../socket/socketLogic.js"
const {Vector3} = BABYLON
const log = console.log


let movement = { moveX: 0, moveZ: 0 }
let camDir
let cPos
let tPos

export function initKeyControls(scene) {
    const btf = scene.getMeshByName("btf")
    const refbx = scene.getMeshByName("refbx")
    window.addEventListener("keydown", e => {
        const cam = scene.getCameraByName("cam")
        const keypressed = e.key.toLowerCase()
        log(keypressed)
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
        
        
        // btf.position = cPos
        // btf.lookAt(new Vector3(tPos.x, btf.position.y, tPos.z))
        // btf.locallyTranslate(new Vector3(movement.moveX*2,0,movement.moveZ*2))
        // const btfPos = btf.position
        const _quat = refbx.rotationQuaternion

        emitMove({
            _id: myCharacterInScene._id,
            movement,
            direction: tPos,
            controllerType: 'key',
            quat: {x:_quat.x, y:_quat.y, z: _quat.z, w: _quat.w}
        })
    })
    window.addEventListener("keyup", e => {
        const cam = scene.getCameraByName("cam")
        const keypressed = e.key.toLowerCase()
        let willStop = false
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
        }
        if(!willStop) return
        let myCharacterInScene = getCharacter()
        if (!myCharacterInScene) return
        camDir = cam.getForwardRay().direction
        cPos = myCharacterInScene.mainBody.position
        tPos = { x: cPos.x + camDir.x, y: cPos.y, z: cPos.z + camDir.z }
        
        if (keypressed === " ") return emitAction({ _id: myCharacterInScene._id, actionName: "jump" })

        emitStop({
            _id: myCharacterInScene._id,
            movement,
            loc: {x: cPos.x, y: cPos.y, z: cPos.z},
            direction: tPos,
            controllerType: 'key'
        })
    })
}
