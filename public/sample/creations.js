import { getScene } from "./scenes/createScene.js";
import { getMyDetail } from "./socket/socketLogic.js";

const { Vector3, Animation, MeshBuilder, SceneLoader,PhysicsAggregate ,PhysicsShapeType } = BABYLON
const log = console.log



export async function importCustomModel(_avatarUrl){
    const scene = getScene()
    return await SceneLoader.ImportMeshAsync("", null, _avatarUrl, scene);
}

export async function loadAvatarContainer(scene, glbName, SceneLoader) {
    return await SceneLoader.LoadAssetContainerAsync(glbName, null, scene);
}

export async function createPlayer(detail, animationsGLB, scene) {
  
    const { loc, dir, _id, name, _moving, movement, currentSpd, avatarUrl } = detail
    // const instance = RootAvatar.instantiateModelsToScene()
    const instance = await importCustomModel(avatarUrl)
    // const root = instance.rootNodes[0]
    const root = instance.meshes[0]
    const modelTransformNodes = root.getChildTransformNodes()
   
    // const box = scene.getMeshByName('toInstanceBox')

    // if (!box) return log("main box for body not found")

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
    mainBody.visibility = .6

    root.parent = mainBody
    root.position = new Vector3(0,-1,0)
    root.rotationQuaternion = null
    if (getMyDetail()._id === _id) {
        scene.activeCamera.setTarget(mainBody)
        scene.activeCamera.alpha = -Math.PI / 2
        scene.activeCamera.beta = 1
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
            if (!theNode) {
                console.warn("node not found")
                return oldTarget
            }
            return theNode
        })
        instance.animationGroups.push(clonedAnim);
    })
    instance.animationGroups[0].play(true)

    return {
        _id,
        dir,
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
export function setMeshesVisibility(_meshesArray, _isVisible){
    _meshesArray.forEach(mesh => mesh.isVisible = _isVisible)
}