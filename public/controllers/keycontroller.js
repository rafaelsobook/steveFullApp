import { getCharacter } from "../index.js"
import { emitAction, emitMove, emitStop, getMyDetail } from "../socket/socketLogic.js"
const {Vector3} = BABYLON

let movement = { moveX: 0, moveZ: 0 }
let camDir
let cPos
let tPos

export function initKeyControls(scene) {
    const btf = scene.getMeshByName("btf")
    window.addEventListener("keydown", e => {
        const cam = scene.getCameraByName("cam")
        const keypressed = e.key.toLowerCase()

        let willMove = false
        let myCharacterInScene = getCharacter()
        if (!myCharacterInScene) return
        switch (keypressed) {
            case "w":
                movement.moveZ = 1
                willMove = true
                break
            case "a":
                movement.moveX = -1
                willMove = true
                break
            case "d":
                movement.moveX = 1
                willMove = true
                break
            case "s":
                movement.moveZ = -1
                willMove = true
                break
        }
        if(!willMove) return
        camDir = cam.getForwardRay().direction
        cPos = myCharacterInScene.mainBody.position
        tPos = { x: cPos.x + camDir.x, y: cPos.y, z: cPos.z + camDir.z }
        // btf.position = cPos
        // btf.lookAt(new Vector3(tPos.x, btf.position.y, tPos.z))
        // btf.locallyTranslate(new Vector3(movement.moveX*2,0,movement.moveZ*2))
        // const btfPos = btf.position
        
        emitMove({
            _id: myCharacterInScene._id,
            movement,
            direction: tPos,
            controllerType: 'key'
        })
    })
    window.addEventListener("keyup", e => {
        const cam = scene.getCameraByName("cam")
        const keypressed = e.key.toLowerCase()
        let willStop = false
        switch (keypressed) {
            case "w":
                movement.moveZ = 0
                willStop = true
                break
            case "a":
                movement.moveX = 0
                willStop = true
                break
            case "d":
                movement.moveX = 0
                willStop = true
                break
            case "s":
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
