import { getMyDetail } from "./socket/socketLogic.js";

const { Vector3, Animation, MeshBuilder } = BABYLON
const log = console.log
export async function loadAvatarContainer(scene, glbName, SceneLoader) {
    return await SceneLoader.LoadAssetContainerAsync("https://models.readyplayer.me/66be713b3f3b5915e2df2b32.glb", null, scene);
}
export function createPlayer(detail, RootAvatar, animationsGLB, scene) {
    const { loc, dir, _id, name, _moving, movement, currentSpd } = detail
    const instance = RootAvatar.instantiateModelsToScene()
    const root = instance.rootNodes[0]
    const modelTransformNodes = root.getChildTransformNodes()

    const box = scene.getMeshByName('toInstanceBox')

    if (!box) return log("main box for body not found")

    const mainBody = MeshBuilder.CreateBox(`player.${_id}`, { height: 2 }, scene)

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
                const nodeName = node.name.split(" ")[2]
                if (nodeName === oldTarget.name) theNode = node
            })
            // log(theNode)
            if (!theNode) return oldTarget
            return theNode
        })
        instance.animationGroups.push(clonedAnim);
    })
    instance.animationGroups[0].play(true)

    setInterval(() => {
        root.rotation
    }, 1000)
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