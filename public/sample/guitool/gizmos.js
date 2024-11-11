import { getMyDetail, getSocket } from "../socket/socketLogic.js";
import { createThreeDBtn, createThreeDPanel, getGui3DManager } from "./gui3dtool.js";
const log = console.log



let gm

export function setGizmo(_gizmoManager, scene){
    if(gm !== undefined) return console.log("you already have a gizmo would you like to set 2 gizmos ?")
    gm = _gizmoManager
    
    gm.gizmos.positionGizmo.xGizmo.dragBehavior.onDragEndObservable.add( event => {
        onGizmoMoved()
    });
    gm.gizmos.positionGizmo.yGizmo.dragBehavior.onDragEndObservable.add( event => {
        onGizmoMoved()
    });
    gm.gizmos.positionGizmo.zGizmo.dragBehavior.onDragEndObservable.add( event => {
        onGizmoMoved()
    });

    changeGizmo(true)
    scene.onPointerObservable.add((evt) => {
        
        if(evt.type === BABYLON.PointerEventTypes.POINTERDOWN){
            if(!evt.pickInfo.hit) return
            const pickedMesh = evt.pickInfo.pickedMesh
            if(pickedMesh && gm.attachableMeshes){                
                let selectedMeshWithGizmo = gm.attachableMeshes.find(mesh => mesh.name === pickedMesh.name)
                if(!selectedMeshWithGizmo) return changeGizmo(false) // hide gizmo if the mesh has no gizmo attached
                changeGizmo(true)                
            }
        }
    })
}
export function getGizmo(){
    return gm
}
export function attachToGizmoArray(mesh){
    if(!gm) return false
    if(gm.attachableMeshes){
        gm.attachableMeshes.push(mesh)
    }else{
        gm.attachableMeshes = [mesh]
        gm.usePointerToAttachGizmos = true
    }
    if(mesh) gm.attachToMesh(mesh)

    return true
}
export function changeGizmo(isPositionGizmo, isRotationGizmo,isBoundingBoxGizmo, isScalingGizmo){

    if(!gm) return false
    gm.positionGizmoEnabled = isPositionGizmo
    gm.rotationGizmoEnabled = isRotationGizmo
    gm.scaleGizmoEnabled  = isScalingGizmo
    gm.boundingBoxGizmoEnabled   = isBoundingBoxGizmo
    gm.updateGizmoRotationToMatchAttachedMesh = false

    return true
}


// tools
function onGizmoMoved() {
   
    if(gm.attachedMesh){
        const socket = getSocket() 
        const pos = gm.attachedMesh.position
        const rot = gm.attachedMesh.rotation
        socket.emit("moved-object", {
            pos: {x: pos.x,y:pos.y,z:pos.z},
            rot: {x: rot.x,y:rot.y,z:rot.z},
            _id: gm.attachedMesh.id,
            roomNum: getMyDetail().roomNum
        })
    }
}