const log = console.log
let gm

export function setGizmo(_gizmoManager){
    if(gm !== undefined) return console.log("you already have a gizmo would you like to set 2 gizmos ?")
    gm = _gizmoManager
}
export function getGizmo(){
    return gm
}
export function attachToGizmoArray(mesh){
    if(!gm) return false
    if(gm.attachableMeshes){
        gm.attachableMeshes.push(mesh)
    }
    if(mesh) gm.attachToMesh(mesh)
    return true
}
export function changeGizmo(isPositionGizmo, isRotationGizmo,isBoundingBoxGizmo, isScalingGizmo){
    log("changing gizmo", gm)
    if(!gm) return false
    gm.positionGizmoEnabled = isPositionGizmo
    gm.rotationGizmoEnabled = isRotationGizmo
    gm.scaleGizmoEnabled  = isScalingGizmo
    gm.boundingBoxGizmoEnabled   = isBoundingBoxGizmo

    log(gm.positionGizmoEnabled,
        gm.rotationGizmoEnabled,
        gm.scaleGizmoEnabled,
        gm.boundingBoxGizmoEnabled)
    return true
}