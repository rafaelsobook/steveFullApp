import { getGizmo, setGizmo } from "./guitool/gizmos.js";
import { create3DGuiManager, createThreeDBtn, createThreeDPanel } from "./guitool/gui3dtool.js";
import { getScene } from "./scenes/createScene.js";
import { getMyDetail } from "./socket/socketLogic.js";

const {Quaternion,StandardMaterial,Texture,Color3,Matrix,Mesh, Space, Vector3,GizmoManager, Animation, BoneIKController,Debug, MeshBuilder, SceneLoader,PhysicsAggregate ,PhysicsShapeType } = BABYLON
const log = console.log



export async function importCustomModel(_avatarUrl){
    const scene = getScene()
    return await SceneLoader.ImportMeshAsync("", null, _avatarUrl, scene);
}

export async function importModelContainer(scene, glbName) {
    return await SceneLoader.LoadAssetContainerAsync(glbName, null, scene);
}

export async function createPlayer(detail, animationsGLB, scene, vrHands) {
  
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
    // setInterval(() => {
    //     rHand.position.x += .5
    //     const thumbTip = rHandBones.find(bne => bne.name === "right-handJoint-0")
    //     log("posX: ", thumbTip.getTransformNode().position.x, 'absX: ', thumbTip.getTransformNode().getAbsolutePosition().x)
    // }, 500)
    

    const instance = await importCustomModel(avatarUrl)
    // const root = instance.rootNodes[0]
    const root = instance.meshes[0]
    const modelTransformNodes = root.getChildTransformNodes()

    const avatar = instance.meshes[1]
    const skeleton = instance.skeletons[0]

    let neckNode

    let targetPoint
    skeleton.bones.forEach(bone => {
        // log(bone.name)
        if(bone.name.toLowerCase().includes("neck")){
            // const boneNode = bone.getTransformNode()
            neckNode = skeleton.bones[bone.getIndex()+1].getTransformNode()
            // const boneSceneNode = scene.getTransformNodeByName(bone.name)
            
            // log(boneNode)
            // log(boneSceneNode)

            // createGizmo(scene, boneSceneNode, true)
            let rotY = 0
            // setInterval(() => {
            //     log(`bone rotY: ${boneNode.rotationQuaternion}`)
               
            //     // boneNode.position.z += 1
            // }, 500)
            // const targetQuat = Quaternion.FromEulerVector(new Vector3(3,2,2)).normalize()
            // boneNode.lookAt(new Vector3(1,40,1), 0,0,0, BABYLON.Space.WORLD)
            
            // const refBox = MeshBuilder.CreateBox("refBox", {}, scene)
            // createGizmo(scene, refBox)
            
            // neckNode.rotationQuaternion = Quaternion.Zero() //Quaternion.FromEulerVector(refBox.rotation)
            // scene.registerBeforeRender(() =>{
            //     const camDir = scene.activeCamera.getForwardRay().direction

            //     neckNode.lookAt(refBox.position, Math.PI,Math.PI - Math.PI/8,0, Space.WORLD)


            //     // const lookAt = Matrix.LookAtLH(
            //     //     mainBody.position,
            //     //     new Vector3(0,5,0),
            //     //     Vector3.Up()
            //     // ).invert();
            //     // neckNode.rotationQuaternion = Quaternion.FromRotationMatrix( lookAt );

            //     // boneNode.rotate(BABYLON.Axis.Y, rotY, BABYLON.Space.WORLD, root)
            //     // neckNode.rotationQuaternion = Quaternion.FromEulerVector(refBox.rotation)
            //     // rotY+= Math.PI/60
                
            //     // if(targetPoint)neckNode.lookAt(targetPoint, Math.PI,0,0)
            // })
        }
    })
    const mainBody = MeshBuilder.CreateBox(`player.${_id}`, { height: 2 }, scene)
    // const aggregatePlayer = new PhysicsAggregate(mainBody, PhysicsShapeType.BOX, { mass: 1, friction: 0.5, restitution: 0 }, scene)
    // aggregatePlayer.body.setMotionType(PhysicsMotionType.DYNAMIC);
    // aggregatePlayer.body.disablePreStep = false;
    // aggregatePlayer.body.setMassProperties({
    //     inertia: new Vector3(0, 0, 0),
    // });
    // aggregatePlayer.body.setCollisionCallbackEnabled(true);

    mainBody.position = new Vector3(loc.x, 1, loc.z)
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

    // implementing IK Controller For VR
    const bonesSelection = 
    [
        {name:'LeftHand' },
        {name:'RightHand' },
    ];
    let leftHandControl
    let rightHandControl    
    bonesSelection.forEach(elem => {        
        // Finding Bone
        const bone = skeleton.bones.find(bone => bone.name.includes(elem.name));

        // leftHandControl.parent = avatar

        // leftHandControl.rotationQuaternion = null
        // bone.getPositionToRef(BABYLON.Space.WORLD, avatar, leftHandControl.position);
        // leftHandControl.parent = avatar

        // let handikCtrl = new BoneIKController(
        //     avatar,
        //     targetBone,
        //     {
                
        //         poleAngle: 0,
        //         targetMesh: control
        //     }
        // );
        // // log(skeleton.bones[bone.getIndex()-1].name)
        // // log(bone.name)
        // ikCtrls.push(handikCtrl);
        // handikCtrl.update()
        // handikCtrl.maxAngle = Math.PI * .9

        // bone.getPositionToRef(BABYLON.Space.WORLD, avatar, leftHandControl.position);
    });

    // to view skeleton
    // const viewer = new Debug.SkeletonViewer(skeleton, avatar, scene, false, 1, { 
    //     displayMode: Debug.SkeletonViewer.DISPLAY_SPHERE_AND_SPURS
    // });
    // viewer.isEnabled = true;

    // scene.registerBeforeRender( () => {
    //     if (ikCtrls.length > 0) {
    //         ikCtrls.forEach(ctrl => ctrl.update());
    //     }
    // });

    // scene.onPointerDown = () => {
    //     const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), scene.activeCamera)
    //     const pickInfo = scene.pickWithRay(ray)

    //     if(pickInfo.hit){
    //         targetPoint = pickInfo.pickedPoint;
    //         log(targetPoint)

    //         neckNode.lookAt(targetPoint, 0,0,0)
    //     }
        
    // }

    // leftHandControl.rotationQuaternion = Quaternion.Identity()
    // rightHandControl.rotationQuaternion = Quaternion.Identity()
    if(!wristPos && !wristQuat) {
        // leftHandControl.isVisible = false
        // rightHandControl.isVisible = false
    }



    return {
        _id,
        dir,
        headDirection: false, //{x:0,y:2,z:0},
        mainBody,
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

        leftHandControl,
        rightHandControl,
        rHand,
        lHand,
        rHandMesh,
        lHandMesh,
        rHandBones,
        lHandBones,
        neckNode
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
export function createMesh(scene, pos, meshShape){
    let mesh
    switch(meshShape){
        case "sphere":
            mesh = new MeshBuilder.CreateSphere('sphere', {}, scene)
            mesh.position = new Vector3(pos.x,pos.y,pos.z) 
            new PhysicsAggregate(mesh, PhysicsShapeType.SPHERE, { mass: .5, friction: 0.01, restitution: .1}, scene)
        break
        default:
            mesh = new MeshBuilder.CreateBox('box', {}, scene)
            mesh.position = new Vector3(pos.x,pos.y,pos.z) 
            new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: .5, friction: 0.01, restitution: .1}, scene)
        break
    }
    return mesh
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
    log("success parenting mesh")
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

export function randomNumToStr(){
    return Math.random().toLocaleString().split(".")[1]
}

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