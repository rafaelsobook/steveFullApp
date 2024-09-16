const { SkyMaterial,StandardMaterial,Texture, MeshBuilder, Matrix, PointerEventTypes, Mesh, Animation, SceneLoader, Scene, Vector3, ArcRotateCamera, HemisphericLight } = BABYLON

import { initJoyStick } from '../controllers/thumbController.js'
import { initVrStickControls } from '../controllers/vrcontroller.js'
import { createPlayer, loadAvatarContainer } from '../creations.js'
import { getCharacter, getState, setState } from '../index.js'
import { emitMove, getAllPlayersInSocket, getMyDetail, getSocket } from '../socket/socketLogic.js'

const log = () => {
    console.log
}

let currentAnimation
let newAnimation
let interval


let players = []

// necessities to create player
let scene
let AvatarRoot
let animationsGLB = []

export function getScene() {
    return scene
}

export async function createScene(_engine, _chosenAvatar) {
    scene = new Scene(_engine)
    const cam = new ArcRotateCamera('cam', -Math.PI / 2, 1, 10, Vector3.Zero(), scene)
    cam.attachControl(document.querySelector('canvas'), true)
    // scene.createDefaultEnvironment()
    const light = new HemisphericLight('light', new Vector3(0, 10, 0), scene)

    // const box = MeshBuilder.CreateBox("toInstanceBox", { height: 2 }, scene)
    // const btf = MeshBuilder.CreateBox("btf", {}, scene)
    // // const btf = MeshBuilder.CreateBox("toInstanceBox", { height: 2}, scene)
    // // Set the pivot matrix

    // box.position = new Vector3(2, 1, 0)
    // box.setPivotPoint(new Vector3(0, -1, 0));
    // log(box.getAbsolutePosition())

    const ground = MeshBuilder.CreateGround("asd", { width: 100, height: 100 }, scene)
    const mat = new StandardMaterial("mat", scene)
    const tex = new Texture("./images/tex.png", scene);
    tex.uScale = 12
    tex.vScale = 12
    mat.diffuseTexture = tex
    ground.material =mat
    // const skybox = MeshBuilder.CreateBox("skyBox", {size: 500}, scene);
    // skybox.infiniteDistance = true;

    // // Create SkyMaterial and apply it to the skybox
    // const skyMaterial = new SkyMaterial("skyMaterial", scene);
    // skyMaterial.backFaceCulling = false;

    // skyMaterial.inclination = 0.1; // Sun position (0 is sunrise, 0.5 is noon, 1 is sunset)
    // skyMaterial.turbidity = .5; // Lower turbidity for a clearer sky
    // skyMaterial.luminance = .9; // Higher luminance for a brighter sky
    // skyMaterial.rayleigh = 2; // Adjust the scattering of light

    // skybox.material = skyMaterial;

    AvatarRoot = await loadAvatarContainer(scene, _chosenAvatar.avatarUrl, SceneLoader)

    await importAnimations("idle_anim.glb")
    await importAnimations("walk_anim.glb") //1
    // await importAnimations("jump_anim.glb")
    await importAnimations("jump_new.glb")
    await importAnimations("walkback_anim.glb")

    let sessionMode = "immersive-vr"
    // let sessionMode = "inline"

    const xrHelper = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [ground],
        uiOptions: {
            sessionMode
        },
        disableTeleportation: true
    })

    const featureManager = xrHelper.baseExperience.featuresManager;

    // featureManager.enableFeature(BABYLON.WebXRFeatureName.MOVEMENT, "latest", {
    //     xrInput: xrHelper.input,
    //     movementOrientationFollowsViewerPose: true,
    //     // orientationPreferredHandedness: "left"
    // })
    await scene.whenReadyAsync()

    setState("GAME")
    checkPlayers() // avatarUrl of everyplayers
    getCharacter()

    initJoyStick(getSocket(), cam, scene)
    initVrStickControls(scene, xrHelper)

    // scene.onPointerObservable.add((e) => {
    //     if (e.type === PointerEventTypes.POINTERDOWN) {
    //         const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), scene.activeCamera);
    //         let pickInfo = scene.pickWithRay(ray);
    //         const clickedMeshName = pickInfo.pickedMesh.name.toLowerCase()
    //         const clickedPos = pickInfo.pickedMesh.getAbsolutePosition()
    //         const myDetail = getMyDetail()
    //         const myMesh = scene.getMeshByName(`player.${myDetail._id}`)
    //         if(!myMesh) return log('cannot find my mesh')
    //         const currentPos = myMesh.position
    //         log('will move')
    //         emitMove({
    //             _id: myDetail._id, 
    //             movementName: "clickedTarget",
    //             loc: {x: currentPos.x, y: currentPos.y,z: currentPos.z}, 
    //             direction: {x: clickedPos.x, y: currentPos.y, z: clickedPos.z} 
    //           })
    //     }
    // });
    scene.registerBeforeRender(() => {
        const deltaT = _engine.getDeltaTime() / 1000
        players.forEach(pl => {
            if (pl._moving) {
                // pl.anims[1].play()
                
                pl.root.lookAt(new Vector3(pl.movement.moveX, pl.root.position.y, pl.movement.moveZ),0,0,0,BABYLON.Space.Local)
                pl.root.addRotation(0,Math.PI,0)
                pl.mainBody.lookAt(new Vector3(pl.dir.x, pl.mainBody.position.y, pl.dir.z), 0, 0, 0)
                pl.mainBody.locallyTranslate(new Vector3(pl.currentSpd * deltaT * pl.movement.moveX, 0, pl.currentSpd * deltaT * pl.movement.moveZ))
                // pl.root.position.x = pl.mainBody.position.x
                // pl.root.position.z = pl.mainBody.position.z
                // pl.mainBody.lookAt(new Vector3(pl.dir.x, pl.mainBody.position.y, pl.dir.z),0,0,0)
                if(!pl._actionName) blendAnimv2(pl, pl.anims[1], pl.anims, true)
            }
        })
    })
    return { scene }
}

function importAnimations(animationGLB, _scene) {

    return SceneLoader.ImportMeshAsync(null, "./models/" + animationGLB, null, _scene)
        .then((result) => {
            result.meshes.forEach(element => {
                if (element) element.dispose();
            });
            animationsGLB.push(result.animationGroups[0]);
        });
}

function* animationBlending(fromAnim, fromAnimSpeedRatio, toAnim, toAnimSpeedRatio, repeat, speed) {
    let currentWeight = 1;
    let newWeight = 0;
    fromAnim.stop();
    toAnim.play(repeat);
    fromAnim.speedRatio = fromAnimSpeedRatio;
    toAnim.speedRatio = toAnimSpeedRatio;
    while (newWeight < 1) {
        newWeight += speed;
        currentWeight -= speed;
        toAnim.setWeightForAllAnimatables(newWeight);
        fromAnim.setWeightForAllAnimatables(currentWeight);
        yield;
    }
    currentAnimation = toAnim;
}

export function blendAnimv2(pl, toAnim, _anims, isLooping, afterEndDetail) {
    let currentWeight = 1
    let newWeight = 0
    let desiredAnimIsPlaying = false
    pl.anims.forEach(anim => {
        if (anim.isPlaying) {
            if (anim.name === toAnim.name) return desiredAnimIsPlaying = true
        }
    })
    if (desiredAnimIsPlaying) return
    let currentPlayingAnim = pl.anims.find(anim => anim.isPlaying)// idle anim
    if (!currentPlayingAnim) {
        currentPlayingAnim = pl.anims[0]
        if (afterEndDetail) {
            currentPlayingAnim = afterEndDetail.lastAnimation
        }
    }
    currentPlayingAnim.setWeightForAllAnimatables(currentWeight)
    toAnim.setWeightForAllAnimatables(newWeight)

    currentPlayingAnim.stop()
    toAnim.play(isLooping)
    clearInterval(pl.weightInterval)
    pl.weightInterval = setInterval(() => {
        currentWeight -= .1
        newWeight += .1
        currentPlayingAnim.setWeightForAllAnimatables(currentWeight)
        toAnim.setWeightForAllAnimatables(newWeight)
        // log(newWeight)
        if (newWeight >= 1) return clearInterval(pl.weightInterval)
    }, 50)
    toAnim.onAnimationEndObservable.addOnce(() => {
        if (afterEndDetail) afterEndDetail.run()
    })
}
export function rotateAnim(dirTarg, body, rotationAnimation, scene, spdRatio, cb) {
    var diffX = dirTarg.x - body.position.x;
    var diffY = dirTarg.z - body.position.z;
    const angle = Math.atan2(diffX, diffY)

    // rotationAnimation.setKeys([
    //     { frame: 0, value: body.rotation.y },
    //     // { frame: 40, value:  angle/3},
    //     { frame: 30, value: angle}
    // ]);

    let angleDifference = angle - body.rotation.y;

    // log(angleDifference)

    if (angleDifference < 0) return
    // Ensure the angle is within the range [-π, π]
    if (angleDifference > Math.PI) {
        angleDifference -= 2 * Math.PI;
    } else if (angleDifference < -Math.PI) {
        angleDifference += 2 * Math.PI;
    }
    const targetAngle = body.rotation.y + angleDifference
    // if(body.rotation.y === targetAngle) return

    // Set up the rotation animation with the normalized angle
    rotationAnimation.setKeys([
        { frame: 0, value: body.rotation.y },
        { frame: 30, value: targetAngle }
    ]);

    body.animations[0] = rotationAnimation
    // scene.stopAnimation(body)
    scene.beginAnimation(body, 0, 30, false, spdRatio ? spdRatio : 4, () => {
        if (cb) cb()
    });
}

export function checkPlayers() {
    const state = getState()
    if (state !== "GAME") return log('Game is still not ready')
    const totalPlayers = getAllPlayersInSocket()
    if (totalPlayers.length) {
        totalPlayers.forEach(pl => {
            const playerInScene = players.some(plscene => plscene._id === pl._id)
            if (playerInScene) return log('player is already in scene')
            createPlayer(pl, AvatarRoot, animationsGLB, scene).then(newP => players.push(newP))            
        })
    }
}
export function getPlayersInScene() {

    return players
}
export function playerDispose(playerDetail) {
    log(playerDetail)
    const playerToDispose = players.find(pl => pl._id === playerDetail._id)
    if (playerToDispose) {
        log(playerToDispose)
        playerToDispose.anims.forEach(anim => anim.dispose())
        playerToDispose.mainBody?.getChildren()[0].dispose()

        players = players.filter(pl => pl._id !== playerToDispose._id)
    }
}