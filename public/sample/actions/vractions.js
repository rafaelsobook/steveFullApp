const { Vector3 } = BABYLON
import { getMyDetail } from "../socket/socketLogic.js";
const log = console.log

let timeOutKeyId = {}
let isReloading = {}



export function runItemActions(scene, socket, r_indxTip, r_wrist) {
    const myDetail = getMyDetail()

    if (myDetail && myDetail.equipment) {
        myDetail.equipment.forEach(item => {
            item.actions.forEach(action => {
                
                if(eval(action.trigger)){
                    if(isReloading[item.name]) return
                    
                    const itemMesh = scene.getMeshByName(`${item.id}.${myDetail._id}`)
                    if(!itemMesh) return log("item triggered not found")
                    if(!itemMesh.isVisible) return log("item is not visible")                    
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
                }
            })
            
            // log(eval("Vector3.Distance(r_indxTip.position, r_wrist.position)"))
        })
    }
}

