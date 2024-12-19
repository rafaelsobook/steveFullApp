import { getPlayersInScene } from "../scenes/createScene.js"
import { getMyDetail, getSocket } from "../socket/socketLogic.js"

const { PointerEventTypes, Vector3 } = BABYLON
const log = console.log

let isReloading = {}
let timeOutKeyId = {}

export function initPointerDown(scene){
    scene.onPointerObservable.add(() => {
        const myDetail = getMyDetail()
        const socket = getSocket()
        const myPlayer = getPlayersInScene().find(pl => pl._id === myDetail._id)
        if(myPlayer && myPlayer.rightIKActive){
            
            myDetail.equipment.forEach(item => {
                item.actions.forEach(action => {
                    
             
                    if(isReloading[item.name]) return
                    
                    const itemMesh = scene.getMeshByName(`${item.id}.${myDetail._id}`)
                    if(!itemMesh) {
                        log(`${item._id}.${myDetail._id}`)
                        return log("item triggered not found")
                    }
                    if(!itemMesh.isVisible) return log("item is not visible")
                    log(itemMesh.isVisible)
                    
                    // const respawn_offset = action.respawn_offset
                    // const target_offset = action.target_offset
                    
                    const respawnPos = eval(action.pos)
                    const targDir = eval(action.dir)

                    const bulletDir = { x: targDir.x - respawnPos.x, y: targDir.y-respawnPos.y, z: targDir.z - respawnPos.z}
                    
                    socket.emit(action.name, { 
                        pos: {x: respawnPos.x, y: respawnPos.y, z: respawnPos.z},
                        dir: bulletDir,
                        roomNum: myDetail.roomNum,
                        resulting_action: action.resulting_action
                    })

                    isReloading[item.name] = true
                    if(timeOutKeyId[item.name]) clearTimeout(timeOutKeyId[item.name])
                    timeOutKeyId[item.name] = setTimeout(() => {
                        isReloading[item.name] = false
                    }, 1000)
                    
                })
                
                // log(eval("Vector3.Distance(r_indxTip.position, r_wrist.position)"))
            })
            
        }
    }, PointerEventTypes.POINTERDOWN)
}