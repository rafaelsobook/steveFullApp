const {Quaternion,Color3, SkyMaterial,Debug, BoneIKController, GizmoManager,Scalar,HavokPlugin,PhysicsAggregate,PhysicsShapeType, ActionManager,ExecuteCodeAction, StandardMaterial,Texture, MeshBuilder, Matrix, PointerEventTypes, Mesh, Animation, SceneLoader, Scene, Vector3, ArcRotateCamera, HemisphericLight } = BABYLON

import { initJoyStick } from '../controllers/thumbController.js'
import { initVrStickControls } from '../controllers/vrcontroller.js'
import { createMesh, createPlayer, importCustomModel, importModelContainer } from '../creations.js'
import { bylonUIInit } from '../guitool/guitool.js'
import { createOptScreen } from '../guitool/vrui.js'
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
// let scene
let AvatarRoot
let animationsGLB = []
let vrHands = {
    right: undefined,
    left: undefined
}

export function getScene() {
    return scene
}

export async function createScene(_engine) {
    scene = new Scene(_engine)
    // scene.useRightHandedSystem = true;
    const cam = new ArcRotateCamera('cam', -Math.PI / 2, 1, 10, Vector3.Zero(), scene)
    cam.attachControl(document.querySelector('canvas'), true)
    cam.wheelDeltaPercentage = 0.01;
    cam.minZ = 0.01
    cam.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    // scene.createDefaultEnvironment()
    const light = new HemisphericLight('light', new Vector3(0, 10, 0), scene)

    const plugin = new HavokPlugin(true, await HavokPhysics());
    scene.enablePhysics(new Vector3(0, -9.8, 0), plugin);

    bylonUIInit()
    // createOptScreen(scene, false, {x:-1, y: 2,z:-2})
    const ground = createGround(scene)
    createRefbx(scene)
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

    // AvatarRoot = await loadAvatarContainer(scene, _chosenAvatar.avatarUrl, SceneLoader)

    await importAnimations("idle_anim.glb")
    await importAnimations("walk_anim.glb") //1
    // await importAnimations("jump_anim.glb")
    await importAnimations("jump_new.glb")
    await importAnimations("walkback_anim.glb")
    createHandMat(scene, true)
    const rHand = await importModelContainer(scene, './models/rightHand.glb')
    const lHand = await importModelContainer(scene, './models/leftHand.glb')
    vrHands = {
        right: rHand,
        left: lHand
    }

    let sessionMode = "immersive-vr"
    // let sessionMode = "inline"

    const xrHelper = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [ground],
        uiOptions: {
            sessionMode
        },
        disableTeleportation: true
    })
    xrHelper.pointerSelection.detach()
    // const featureManager = xrHelper.baseExperience.featuresManager;

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
    await initVrStickControls(scene, xrHelper)

    const decimalMaterial = new StandardMaterial('decimal', scene)
    decimalMaterial.diffuseTexture = new Texture('./images/dragon.png', scene)
    decimalMaterial.emissiveTexture = new Texture('./images/dragon.png', scene)
    decimalMaterial.diffuseTexture.hasAlpha = true
    decimalMaterial.emissiveTexture.hasAlpha = true
    decimalMaterial.zOffset = -2

    // havok sphere
    // const sphere =  createMesh(scene, {x: Scalar.RandomRange(-1,1), y: 5, z: Scalar.RandomRange(-1,1)}, "sphere")

    // sphere.actionManager = new ActionManager(scene)
    // sphere.actionManager.registerAction(new ExecuteCodeAction(
    //     ActionManager.OnPickDownTrigger, e => {
    //         const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), cam)
    //         const pickInfo = scene.pickWithRay(ray)

    //         const normal = scene.activeCamera?.getForwardRay().direction.negateInPlace().normalize()
    //         const decal = MeshBuilder.CreateDecal('decal', sphere, {
    //             position: pickInfo.pickedPoint,
    //             normal,
    //             // size: decalSize,
    //         })
    //         decal.material = decimalMaterial
    //     }
    // ))

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
                
                // pl.root.lookAt(new Vector3(pl.movement.moveX, pl.root.position.y, pl.movement.moveZ),0,0,0,BABYLON.Space.Local)
                // pl.root.addRotation(0,Math.PI,0)
                // pl.mainBody.lookAt(new Vector3(pl.dir.x, pl.mainBody.position.y, pl.dir.z), 0, 0, 0)
               
                switch(pl.controller){
                    case "key":
                        if(pl.rootQuat){
                            const q = pl.rootQuat
                            const quat = new Quaternion(q.x,q.y,q.z,q.w)
                            // Quaternion.SlerpToRef(pl.root.rotationQuaternion, new Quaternion(0,1,0,0), 0.1, pl.root.rotationQuaternion)
                            Quaternion.SlerpToRef(pl.mainBody.rotationQuaternion, quat, 0.1, pl.mainBody.rotationQuaternion)
                        }
                        pl.mainBody.locallyTranslate(new Vector3(0, 0, pl.currentSpd * deltaT * 1))
                    break
                    case "mobile-joystick":
                        pl.root.lookAt(new Vector3(pl.movement.moveX, pl.root.position.y, pl.movement.moveZ),Math.PI,0,0,BABYLON.Space.Local)
                        
                        pl.mainBody.lookAt(new Vector3(pl.dir.x, pl.mainBody.position.y, pl.dir.z), 0, 0, 0)
                        pl.mainBody.locallyTranslate(new Vector3(pl.currentSpd * deltaT * pl.movement.moveX, 0, pl.currentSpd * deltaT * pl.movement.moveZ))
                    break
                }
                
                // pl.mainBody.physicsBody.setLinearVelocity(pl.currentSpd * deltaT * pl.movement.moveX, 0, pl.currentSpd * deltaT * pl.movement.moveZ)
                // pl.root.position.x = pl.mainBody.position.x
                // pl.root.position.z = pl.mainBody.position.z
                // pl.mainBody.lookAt(new Vector3(pl.dir.x, pl.mainBody.position.y, pl.dir.z),0,0,0)
                if(!pl._actionName) blendAnimv2(pl, pl.anims[1], pl.anims, true)
            }
            if(pl.headDirection){
                pl.neckNode.lookAt(new Vector3(pl.headDirection.x, pl.headDirection.y, pl.headDirection.z), Math.PI,Math.PI - Math.PI/8,0, BABYLON.Space.WORLD)
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
            createPlayer(pl, animationsGLB, scene, vrHands).then(newP => players.push(newP))            
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

        playerToDispose.leftHandControl?.dispose()
        playerToDispose.rightHandControl?.dispose()

        players = players.filter(pl => pl._id !== playerToDispose._id)
    }
}


// environment creations 
function createGround(scene){
    const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene)
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0}, scene)

    const mat = new StandardMaterial("mat", scene)
    const tex = new Texture("./images/tex.png", scene);
    tex.uScale = 12
    tex.vScale = 12
    mat.diffuseTexture = tex
    mat.specularColor = new BABYLON.Color3(0,0,0)
    mat.backFaceCulling = true
    ground.material =mat

    return ground
}
function createRefbx(scene){
    const refbx = MeshBuilder.CreateBox("refbx", {height: 2, size: .5}, scene)
    const head = MeshBuilder.CreateBox("refbx", {size: .66}, scene)
    head.parent = refbx
    head.position = new Vector3(0,.9,.3)
    refbx.isVisible = false
    head.isVisible = false
    refbx.rotationQuaternion = Quaternion.FromEulerVector(refbx.rotation)
}

function createHandMat(scene, isLight){
    var handMat = new StandardMaterial("handMat", scene);
    handMat.diffuseColor = new Color3(0.8, 0.6, 0.5);  // Skin tone colo
    if(isLight) handMat.emissiveColor = new Color3(1.0, 0.8, 0.6);  // Emissive glow color
    handMat.specularColor = new Color3(0,0,0)
    handMat.backFaceCulling = true
    return handMat
}