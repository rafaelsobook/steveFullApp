import { getMyDetail, getSocket } from "../socket/socketLogic.js";
import { createThreeDBtn, createThreeDPanel, getGui3DManager } from "./gui3dtool.js";
const log = console.log



let gm

export function setGizmo(_gizmoManager, scene){
    if(gm !== undefined) return console.log("you already have a gizmo would you like to set 2 gizmos ?")
    gm = _gizmoManager
    
    // changeGizmo(true, false, true)
    gm.gizmos.positionGizmo.xGizmo.dragBehavior.onDragEndObservable.add( event => {
        onGizmoMoved()
    });
    gm.gizmos.positionGizmo.yGizmo.dragBehavior.onDragEndObservable.add( event => {
        onGizmoMoved()
    });
    gm.gizmos.positionGizmo.zGizmo.dragBehavior.onDragEndObservable.add( event => {
        onGizmoMoved()
    });

    gm.boundingBoxGizmoEnabled = true // this one is mandatory 
    
    gm.gizmos.boundingBoxGizmo.onRotationSphereDragEndObservable.add(() => {
        console.log("Bounding box Rotated");
        onGizmoMoved();
    });
    
    // gizmoManager.boundingBoxDragBehavior.options = {dragPlaneNormal: new BABYLON.Vector3(0,1,0)}// to only enable it on x and z
    gm.gizmos.boundingBoxGizmo.pointerDragBehavior.onDragEndObservable.add(() => {
        console.log("BoundingBoxGizmo moved");
        onGizmoMoved();
    });
    // gm.gizmos.boundingBoxGizmo.onDragStartObservable.add(() => {
    //     console.log("Bounding box DragStarted");
    //     // onGizmoMoved();
    // });
    changeGizmo(true) // I need to make the other gizmo false to avoid the boundingBoxGizmo from pulling other objects
    scene.onPointerObservable.add((evt) => {
        
        if(evt.type === BABYLON.PointerEventTypes.POINTERDOWN){
            if(!evt.pickInfo.hit) return
            const pickedMesh = evt.pickInfo.pickedMesh
            if(pickedMesh && gm.attachableMeshes){                
                let selectedMeshWithGizmo = gm.attachableMeshes.find(mesh => mesh.name === pickedMesh.name)
                if(!selectedMeshWithGizmo) return changeGizmo(false) // hide gizmo if the mesh has no gizmo attached
                changeGizmo(true, false, true, false)
                if (!gm.gizmos.boundingBoxGizmo.pointerDragBehavior) {
                    console.error("Drag behavior is not initialized.");
                } else {
                    console.log("Drag behavior is active.");
                    gm.gizmos.boundingBoxGizmo.enableDragBehavior();
                }
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
    gm.boundingBoxGizmoEnabled = isBoundingBoxGizmo
    gm.updateGizmoRotationToMatchAttachedMesh = false
    // const boundingGizmo = gm.gizmos.boundingBoxGizmo

    return true
}


// tools
function onGizmoMoved() {
   
    if(gm.attachedMesh){
        const socket = getSocket() 
        const pos = gm.attachedMesh.position
        const rot = gm.attachedMesh.rotationQuaternion
        
        // log(gm.attachedMesh.name, gm.attachedMesh.rotationQuaternion)
        socket.emit("moved-object", {
            pos: {x: pos.x,y:pos.y,z:pos.z},
            rotQ: {x: rot.x,y:rot.y,z:rot.z, w: rot.w},
            _id: gm.attachedMesh.id,
            roomNum: getMyDetail().roomNum
        })
    }
}