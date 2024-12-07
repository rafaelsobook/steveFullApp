import { getGizmo, setGizmo } from "./guitool/gizmos.js";
import { create3DGuiManager, createThreeDBtn, createThreeDPanel } from "./guitool/gui3dtool.js";
import { createAggregate } from "./physics/aggregates.js";
import { assignGroup, FILTER_GROUP_OWNER_CAPSULE } from "./physics/filterGroup.js";
import { getScene } from "./scenes/createScene.js";
import { getMyDetail } from "./socket/socketLogic.js";

const {Quaternion,StandardMaterial,Texture,Color3,Matrix,Mesh, Space, ActionManager,
PhysicsRaycastResult,
Vector3,GizmoManager, Animation, BoneIKController,Debug, MeshBuilder, SceneLoader } = BABYLON
const log = console.log


export async function importCustomModel(_avatarUrl, removeParent){
    const scene = getScene()
    const Model = await SceneLoader.ImportMeshAsync("", null, _avatarUrl, scene);
    
    if(removeParent){
        Model.meshes[1].parent = null
        Model.meshes[0].dispose()
        return Model.meshes[1]
    } else return Model
}

export async function importModelContainer(scene, glbName) {
    return await SceneLoader.LoadAssetContainerAsync(glbName, null, scene);
}

export async function createPlayer(detail, animationsGLB, scene, vrHands) {
    const footRayCast = new PhysicsRaycastResult()

    const { loc, dir, _id, name, _moving, movement, currentSpd, avatarUrl, wristPos, wristQuat } = detail
    
    const ikCtrls = []
    // const instance = RootAvatar.instantiateModelsToScene()
    const handMat = scene.getMaterialByName("handMat")
    const rightInstance = vrHands.right.instantiateModelsToScene()
    const leftInstance = vrHands.left.instantiateModelsToScene()
    const rHand = rightInstance.rootNodes[0]
    const lHand = leftInstance.rootNodes[0]
    const rHandMesh = rHand.getChildren()[1]; rHandMesh.material=handMat
    const lHandMesh = lHand.getChildren()[1]; lHandMesh.material=handMat
    const rHandBones = rightInstance.skeletons[0].bones
    const lHandBones = leftInstance.skeletons[0].bones
    rHandMesh.isVisible = detail.vrHandsVisible 
    lHandMesh.isVisible = detail.vrHandsVisible 

    const instance = await importCustomModel(avatarUrl)
    // const root = instance.rootNodes[0]
    const root = instance.meshes[0]
    const modelTransformNodes = root.getChildTransformNodes()

    const avatar = instance.meshes[1]
    const skeleton = instance.skeletons[0]

    // const mergeableMeshes = instance.meshes.filter(mesh => mesh.name !== "__root__");
    // mergeableMeshes.forEach(mesh =>{
    //     // mesh.parent = null                          
    //     if(mesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind)){
    //         mesh.setVerticesData(BABYLON.VertexBuffer.TangentKind, null, false);
    //     }
    // })
    // var mainMesh = Mesh.MergeMeshes(mergeableMeshes, true, true, undefined, false, true);
    // log(mainMesh.name)

    let neckNode
    let headBone
    let targetPoint
    skeleton.bones.forEach(bone => {
        const boneName = bone.name.toLowerCase()
 
        if(boneName === "head") headBone = bone.getTransformNode()
        if(boneName.includes("neck")){
            // const boneNode = bone.getTransformNode()
            neckNode = skeleton.bones[bone.getIndex()+1].getTransformNode()// the same as head bone delete in future
        }
    })

    // create bone IK
    // let handikCtrl = new BoneIKController(
    //     avatar,
    //     headBone,
    //     {                
    //         poleAngle: 0,
    //         targetMesh: control
    //     }
    // );
    // ikCtrls.push(handikCtrl);
    // handikCtrl.update()
    // handikCtrl.maxAngle = Math.PI * .9

    const mainBody = createShape({ height: 2, capSubdivisions: 1}, {x: loc.x, y: loc.y+1, z: loc.z}, `player.${_id}`, "capsule")
    const playerAgg = createAggregate(mainBody, {mass: .1}, "capsule")
    playerAgg.body.setMassProperties({inertia: new Vector3(0,0,0)})
    playerAgg.body.disablePreStep = false
    playerAgg.body.setLinearDamping(10)
    assignGroup(playerAgg, FILTER_GROUP_OWNER_CAPSULE)

    mainBody.lookAt(new Vector3(dir.x, mainBody.position.y, dir.z), 0, 0, 0)
    mainBody.isVisible = false
    mainBody.visibility = .3
    mainBody.rotationQuaternion = Quaternion.FromEulerVector(mainBody.rotation)
    root.parent = mainBody
    root.position = new Vector3(0,-1,0)
    // root.rotationQuaternion = null
    if (getMyDetail()._id === _id) {
        scene.activeCamera.setTarget(mainBody)
        scene.activeCamera.alpha = -Math.PI / 2
        scene.activeCamera.beta = 1    
        // panel.linkToTransformNode(mainBody)
    }

    const rotationAnimation = new Animation("rotationAnimation", "rotation.y", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    root.animations[0] = rotationAnimation

    animationsGLB.forEach(anim => {
        const clonedAnim = anim.clone(`walk_anim_${anim.name}`, (oldTarget) => {
            //oldTarget is a transformNode
            let theNode
            modelTransformNodes.forEach(node => {
                // const nodeName = node.name.split(" ")[2]
                const nodeName = node.name
                if (nodeName === oldTarget.name) theNode = node
            })
            // log(theNode)
            if (!theNode) return oldTarget
            
            return theNode
        })
        instance.animationGroups.push(clonedAnim);
    })
    instance.animationGroups[0].play(true)

    return {
        _id,
        dir,
        headDirection: false, //{x:0,y:2,z:0},
        mainBody,
        playerAgg,
        root,
        anims: instance.animationGroups,
        instance,
        rotationAnimation,
        isRotating: false,
        _moving,
        _actionName: undefined,
        movement,
        currentSpd,
        canRotate: true,
        weightInterval: undefined,
        skeleton,

        rHand,
        lHand,
        rHandMesh,
        lHandMesh,
        rHandBones,
        lHandBones,
        neckNode,
        headBone,

        footRayCast,
    }
}
export async function createAvatar_Old(glbName, pos, direction, animationsGLB) {
    const { x, y, z } = pos

    const model = await SceneLoader.ImportMeshAsync('', "./models/", glbName, scene)
    const player = model.meshes[0]
    const body = model.meshes[1]
    var modelTransformNodes = player.getChildTransformNodes();

    const rotationAnimation = new Animation("rotationAnimation", "rotation.y", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CONSTANT);
    animationsGLB.forEach(anim => {
        const newAnim = anim.clone(`walk_anim_${anim.name}`, (oldTarget) => {
            //oldTarget is a transformNode
            const theNode = modelTransformNodes.find(node => node.name === oldTarget.name)
            // log(theNode)
            if (!theNode) return oldTarget
            return theNode
        })
        anim.dispose()
    })
    return { player, body, modelTransformNodes, rotationAnimation }
}

// ordinary mesh

export function createShape(opt, pos, name, meshType, _enableActionManager){
    let mesh 
    let meshName = name ? name : "shape"
    switch(meshType){
        case "sphere":
            mesh = MeshBuilder.CreateSphere(meshName, opt)
        break
        case "capsule":
            mesh = MeshBuilder.CreateCapsule(meshName, opt)
            // mesh = MeshBuilder.CreateCapsule("asd", { height: 1, tessellation: 16, radius: 0.25})
        break
        case "cylinder":
            mesh = MeshBuilder.CreateCylinder(meshName, opt)
        break
        case "ground":
            mesh = MeshBuilder.CreateGround(meshName, opt)
            
        break
        default:
            mesh = MeshBuilder.CreateBox(meshName, opt)
        break
    }
    mesh.checkCollisions = true
    
    if(pos) mesh.position = new Vector3(pos.x,pos.y,pos.z)
    if(_enableActionManager) mesh.actionManager = new ActionManager(getScene())
    return mesh
}
export function createBullet(respawnPos, targetDirection){
    const bullet = createShape({ diameter: .1}, {x:respawnPos.x, y:respawnPos.y, z: respawnPos.z}, "sphere", "sphere")
    let force = 10

    const agg = createAggregate(bullet, {mass: .5}, "sphere")
    const vel = new Vector3(targetDirection.x*force, targetDirection.y*force, targetDirection.z*force)
    // log(vel)
    agg.body.applyImpulse(vel, bullet.getAbsolutePosition())
    agg.body.setCollisionCallbackEnabled(true)
   
    agg.body.getCollisionObservable().add( e => {

        if(e.type === BABYLON.PhysicsEventType.COLLISION_STARTED){
            const hitMesh = e.collidedAgainst.transformNode
            agg.body.setLinearDamping(1)
            // if(hitMesh) log(hitMesh.name)
            if(hitMesh.name.includes("ground")){
                agg.body.setLinearDamping(14)
                agg.body.setCollisionCallbackEnabled(false)
            }
            setTimeout(() => {
                bullet.dispose()
                agg.body.dispose()
            }, 2500)
        }
    })
}
// tools
export function createMat(scene, matName, _diffTex, _bumpTex, _roughTex){
    const mat = new StandardMaterial(matName ? matName : "material", scene)
    if(_diffTex) mat.diffuseTexture = new Texture(_diffTex,scene, false, false)
    if(_bumpTex) mat.bumpTexture = new Texture(_bumpTex, scene,false, false)
    if(_roughTex) mat.specularTexture = new Texture(_roughTex, scene,false, false)
    // mat.specularColor = new Color3(.1,.1,.1)
    // mat.metallic = 1
    return mat
}
export function parentAMesh(_childMesh, _parentMesh, _chldPos, _chldScaleXYZUnit, _chldRotQuat){
    if(!_childMesh) return log("childMesh undefined")
    if(!_parentMesh) return  log("_parentMesh undefined")
    
    _childMesh.parent = _parentMesh
    _childMesh.scaling = new Vector3(_chldScaleXYZUnit,_chldScaleXYZUnit,_chldScaleXYZUnit)
    _childMesh.position = new Vector3(_chldPos.x, _chldPos.y,_chldPos.z)
    _childMesh.rotationQuaternion = new Quaternion(_chldRotQuat.x,_chldRotQuat.y,_chldRotQuat.z,_chldRotQuat.w)
}
export function setMeshPos(_mesh, _desiredPos){
    _mesh.position.x = _desiredPos.x
    _mesh.position.y = _desiredPos.y
    _mesh.position.z = _desiredPos.z
    return _mesh.position
}
export function setMeshesVisibility(_meshesArray, _isVisible){
    _meshesArray.forEach(mesh => mesh.isVisible = _isVisible)
}

export function createGizmo(scene, _meshToAttached, isPositionGizmo,isRotationGizmo, isScaleGizmo, isBoundingGizmo){
    const gizmoManager = new GizmoManager(scene,2);
    gizmoManager.usePointerToAttachGizmos = false;

    if(_meshToAttached) gizmoManager.attachableMeshes = [_meshToAttached];
    // if(_meshToAttached) gizmoManager.attachToNode(_meshToAttached)
    gizmoManager.positionGizmoEnabled= isPositionGizmo
    gizmoManager.rotationGizmoEnabled = isRotationGizmo
    gizmoManager.scaleGizmoEnabled  = isScaleGizmo
    gizmoManager.boundingBoxGizmoEnabled  = isBoundingGizmo
    setGizmo(gizmoManager, scene)
    
    return gizmoManager
}
export function createRefbx(scene){
    const refbx = MeshBuilder.CreateBox("refbx", {height: 2, size: .5}, scene)
    refbx.isVisible = false
    refbx.rotationQuaternion = Quaternion.FromEulerVector(refbx.rotation)
    return refbx
}
export function randomNumToStr(){
    return Math.random().toLocaleString().split(".")[1]
}
// deprecated
// export function createMesh(scene, pos, meshShape){
//     let mesh
//     switch(meshShape){
//         case "sphere":
//             mesh = new MeshBuilder.CreateSphere('sphere', {}, scene)
//             mesh.position = new Vector3(pos.x,pos.y,pos.z) 
//             new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, { mass: .5, friction: 0.01, restitution: .1}, scene)
//         break
//         default:
//             mesh = new MeshBuilder.CreateBox('box', {}, scene)
//             mesh.position = new Vector3(pos.x,pos.y,pos.z) 
//             new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: .5, friction: 0.01, restitution: .1}, scene)
//         break
//     }
//     return mesh
// }

// export function createTextButton(buttonLabel, parentMesh, scene, toCollide){
//     const {Mesh, GUI} = BABYLON
//     const btnMesh = Mesh.CreatePlane("btnPlane", 1, scene);
//     btnMesh.isPickable = false

//     btnMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
//     const textureForName = GUI.AdvancedDynamicTexture.CreateForMesh(btnMesh);

//     const text1 = new GUI.TextBlock();
//     text1.text = buttonLabel
//     text1.color = "red"
//     text1.background = "blue"
//     text1.fontSize = 90;

//     textureForName.addControl(text1);    
//     if(parentMesh) btnMesh.parent = parentMesh
//     // btnMesh.position.x =pos.x
//     // btnMesh.position.y =pos.y
//     // btnMesh.position.z =pos.z

//     if(toCollide){
//         btnMesh.actionManager = new BABYLON.ActionManager(scene)
//         btnMesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
//             {
//                 trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
//                 parameter: toCollide
//             }, e => {
//                 console.log("collided")
//                 btn.background = "yellow";
//             }
//         ))
//         btnMesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
//             {
//                 trigger: BABYLON.ActionManager.OnIntersectionExitTrigger,
//                 parameter: toCollide
//             }, e => {
//                 console.log("OnIntersectionExitTrigger")
//                 btn.background = "red";
//             }
//         ))
//     }
 
//     return btnMesh
// }