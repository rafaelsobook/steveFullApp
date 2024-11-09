const {Quaternion,Color3, Space,Axis, SkyMaterial,Debug, BoneIKController, GizmoManager,Scalar,HavokPlugin,PhysicsAggregate,PhysicsShapeType, ActionManager,ExecuteCodeAction, StandardMaterial,Texture, MeshBuilder, Matrix, PointerEventTypes, Mesh, Animation, SceneLoader, Scene, Vector3, ArcRotateCamera, HemisphericLight } = BABYLON

import { initJoyStick } from '../controllers/thumbController.js'
import { getXrCam, initVrStickControls } from '../controllers/vrcontroller.js'
import { createGizmo, createMat, createShape, createPlayer, importCustomModel, importModelContainer, parentAMesh, setMeshesVisibility, createBullet } from '../creations.js'
import { getSelectedImmMode } from '../dropdown.js'
import { attachToGizmoArray } from '../guitool/gizmos.js'
import { create3DGuiManager, createNearMenu, createSlate, createThreeDBtn, createThreeDPanel } from '../guitool/gui3dtool.js'
import { bylonUIInit, createCheckBox } from '../guitool/guitool.js'
import { createMenuVTwo } from '../guitool/vrui.js'
import { getCharacter, getState, setState } from '../index.js'
import { createAggregate } from '../physics/aggregates.js'
import { emitMove, getAllImportedModelsInSocket, getAllPlayersInSocket, getMyDetail, getSocket } from '../socket/socketLogic.js'

const log = console.log

let currentAnimation
let newAnimation
let interval


let players = []
let modelsInScene = []

// necessities to create player
let scene
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

    log(Math.sin(0))
    log(Math.cos(0))

    const {cam} = initScene(_engine)

    const plugin = new HavokPlugin(true, await HavokPhysics());
    scene.enablePhysics(new Vector3(0, -9, 0), plugin);

    createHandMat(scene, true)
    const rHand = await importModelContainer(scene, './models/rightHand.glb')
    const lHand = await importModelContainer(scene, './models/leftHand.glb')
    vrHands = {
        right: rHand,
        left: lHand
    }

    // const gun = await importCustomModel("./models/gun.glb", true)
    // gun.name = "gun"

    // let num = 0.005
    // scene.registerBeforeRender(() => {
    //     // num+=.001
    //     gun.addRotation(num,num,num)
    // })
    // setInterval(() => {
    //     attachToGizmoArray(gun)
    //     const forwardPos = Vector3.TransformCoordinates(new Vector3(-2,.5,0), gun.computeWorldMatrix(true))
    //     const targetPos = Vector3.TransformCoordinates(new Vector3(-5,.5,0), gun.computeWorldMatrix(true))
    //     const normalizedV = { x: targetPos.x - forwardPos.x, y: targetPos.y-forwardPos.y, z: targetPos.z - forwardPos.z}
    //     createBullet(forwardPos, normalizedV)
    //     // const bullet = createShape({diameter: .4}, forwardPos, "asd", "sphere")
    //     // bullet.lookAt(targetPos,0,0,0)
    //     // const agg = createAggregate(bullet, {mass:1}, "sphere")
    //     // agg.body.applyImpulse(new Vector3(normalizedV.x*10, normalizedV.y*10, normalizedV.z*10), bullet.getAbsolutePosition())
    //     // let intervalForward
    //     // setInterval(() => {
    //     //     agg.body.setLinearVelocity()
    //     // }, 50);
    //     // setTimeout(() => bullet.dispose(), 500)
    // }, 1000)


    bylonUIInit()
    const cave = await importCustomModel("./models/cave.glb", true)
    cave.position.z -= 3
    cave.addRotation(0,Math.PI/2,0)
  
    const caveAgg = createAggregate(cave, {mass:0}, "imported")
    caveAgg.body.setCollisionCallbackEnabled(true)
    caveAgg.body.getCollisionObservable().add(e => {
        if(e.type === "COLLISION_CONTINUED"){
            if(e.collidedAgainst.transformNode.name.includes("player")){
                // e.collidedAgainst.applyImpulse(new Vector3(0,4000,0), e.collidedAgainst.transformNode.getAbsolutePosition()) // works
                e.collidedAgainst.setLinearDamping(10)
            }
        }
    })


    const StairModel = await importCustomModel("./models/stair.glb")
    const stair = StairModel.meshes[1]
    stair.parent = null
    StairModel.meshes[0].dispose()
    stair.position.z += 4
    stair.position.x += 1
    stair.addRotation(0,Math.PI,0)

    const stairAgg = createAggregate(stair, {mass:0}, "imported")
    stairAgg.body.setCollisionCallbackEnabled(true)
    stairAgg.body.getCollisionObservable().add(e => {
        if(e.type === "COLLISION_CONTINUED"){
            if(e.collidedAgainst.transformNode.name.includes("player")){
                // e.collidedAgainst.applyImpulse(new Vector3(0,4000,0), e.collidedAgainst.transformNode.getAbsolutePosition()) // works
                e.collidedAgainst.setLinearDamping(10)
            }
        }
    })
    
    const ground = createGround(scene)
    createAggregate(ground, scene, {mass:0})

    const sphere = createShape({radius: .5},{ x:0, y: 2,z:0}, "sphere", "sphere", true)
    const sphereAgg = createAggregate(sphere, {mass:1})


    const wall = createShape({width: 4, height: 5, depth: 1},{ x:-4, y: 2,z:4}, "box", "box", true)
    createAggregate(wall, {mass:0})
    
    const gm = createGizmo(scene, false, true, false, false, false)

    await importAnimations("idle_anim.glb")
    await importAnimations("walk_anim.glb") //1
    // await importAnimations("jump_anim.glb")
    await importAnimations("jump_new.glb")
    await importAnimations("walkback_anim.glb");


    let sessionMode = getSelectedImmMode()
    // let sessionMode = "inline"

    const xrHelper = await scene.createDefaultXRExperienceAsync({
        floorMeshes: [ground],
        uiOptions: {
            sessionMode
        },
        disableTeleportation: true
    })
    // xrHelper.pointerSelection.detach()
    // const featureManager = xrHelper.baseExperience.featuresManager;

    // featureManager.enableFeature(BABYLON.WebXRFeatureName.MOVEMENT, "latest", {
    //     xrInput: xrHelper.input,
    //     movementOrientationFollowsViewerPose: true,
    //     // orientationPreferredHandedness: "left"
    // })
  
    await scene.whenReadyAsync()
    create3DGuiManager(scene)
    setState("GAME")
    checkPlayers() // avatarUrl of everyplayers
    checkSceneModels()
    getCharacter()

    initJoyStick(getSocket(), cam, scene)
    await initVrStickControls(scene, xrHelper)


    // setInterval(() => {
    //     checkSceneModels()
    // }, 1000)

    const decimalMaterial = new StandardMaterial('decimal', scene)
    decimalMaterial.diffuseTexture = new Texture('./images/dragon.png', scene)
    decimalMaterial.emissiveTexture = new Texture('./images/dragon.png', scene)
    decimalMaterial.diffuseTexture.hasAlpha = true
    decimalMaterial.emissiveTexture.hasAlpha = true
    decimalMaterial.zOffset = -2


    scene.registerBeforeRender(() => {      
        const deltaT = _engine.getDeltaTime() / 1000
        players.forEach(pl => {            
            if (pl._moving) {
                switch(pl.controller){
                    case "key":
                        if(pl.rootQuat){
                            const q = pl.rootQuat
                            const quat = new Quaternion(q.x,q.y,q.z,q.w)
                            Quaternion.SlerpToRef(pl.root.rotationQuaternion, new Quaternion(0,1,0,0), 0.1, pl.root.rotationQuaternion)
                            Quaternion.SlerpToRef(pl.mainBody.rotationQuaternion, quat, 0.1, pl.mainBody.rotationQuaternion)
                        }
                        pl.mainBody.locallyTranslate(new Vector3(0, 0, pl.currentSpd * deltaT))                       
                        // pl.playerAgg.body.setLinearVelocity(new Vector3(pl.dir.x, 0, pl.dir.z))
                    break
                    case "mobile-joystick":
                        pl.root.lookAt(new Vector3(pl.movement.moveX, pl.root.position.y, pl.movement.moveZ),Math.PI,0,0,BABYLON.Space.Local)
                        
                        pl.mainBody.lookAt(new Vector3(pl.dir.x, pl.mainBody.position.y, pl.dir.z), 0, 0, 0)
                        pl.mainBody.locallyTranslate(new Vector3(pl.currentSpd * deltaT * pl.movement.moveX, 0, pl.currentSpd * deltaT * pl.movement.moveZ))
                    break
                    case "vr-hands":
                        // log("moving via vr hands")
                        Quaternion.SlerpToRef(pl.root.rotationQuaternion, new Quaternion(0,1,0,0), 0.1, pl.root.rotationQuaternion)
                        //  pl.root.lookAt(new Vector3(pl.movement.moveX, pl.root.position.y, pl.movement.moveZ),0,0,0, Space.LOCAL)
                        // Vector3.SlerpToRef(pl.mainBody.position, new Vector3(pl.camPosInWorld.x, pl.mainBody.position.y, pl.camPosInWorld.z), 0.1, pl.mainBody.position)
                        pl.mainBody.lookAt(new Vector3(pl.dir.x, pl.mainBody.position.y, pl.dir.z), 0, 0, 0)
                        if(pl.camPosInWorld){
                            pl.mainBody.position.x = pl.camPosInWorld.x
                            pl.mainBody.position.z = pl.camPosInWorld.z
                        }else {
                            pl.mainBody.locallyTranslate(new Vector3(0, 0, pl.currentSpd * deltaT)) 
                            if(pl._id === getCharacter()._id){
                                getXrCam().position.x = pl.mainBody.position.x
                                getXrCam().position.z = pl.mainBody.position.z

                            }
                        }
                        // pl.mainBody.lookAt(new Vector3(pl.dir.x, pl.mainBody.position.y, pl.dir.z), 0, 0, 0)
                        // pl.mainBody.locallyTranslate(new Vector3(pl.currentSpd * deltaT * pl.movement.moveX, 0, pl.currentSpd * deltaT * pl.movement.moveZ))
                        // if(distance <= .1){
                        //     pl._moving = false
                        // }else pl._moving = true
                        // log(distance)
                    break
                }
                
                if(!pl._actionName) blendAnimv2(pl, pl.anims[1], pl.anims, true)
            }
         
            if(pl.headDirection && pl.controller === "vr-hands"){                
                pl.neckNode.lookAt(new Vector3(pl.headDirection.x, pl.headDirection.y, pl.headDirection.z), Math.PI,Math.PI - Math.PI/8,0, BABYLON.Space.WORLD)
            }

            const plPos = pl.mainBody.getAbsolutePosition()
            const start = new Vector3(plPos.x, plPos.y, plPos.z);
            const end = new Vector3(plPos.x, plPos.y - 1.1, plPos.z);
            // log(plPos.y)
            scene.getPhysicsEngine().raycastToRef(start, end, pl.footRayCast);
            if(!pl.footRayCast.hasHit){pl.playerAgg.body.setLinearDamping(0)
            }else pl.playerAgg.body.setLinearDamping(10)
        })
    })
    return { scene }
}
function initScene(_engine){
    scene = new Scene(_engine)
    // scene.useRightHandedSystem = true;
    const cam = new ArcRotateCamera('cam', -Math.PI / 2, 1, 10, Vector3.Zero(), scene)
    cam.attachControl(document.querySelector('canvas'), true)
    cam.wheelDeltaPercentage = 0.01;
    cam.minZ = 0.01
    cam.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    // scene.createDefaultEnvironment()
    const light = new HemisphericLight('light', new Vector3(0, 10, 0), scene)

    createMat(scene, "sword", "./textures/sword/sword.jpg", "./textures/sword/swordnormal.jpg", "./textures/sword/swordrough.jpg")
    createRefbx(scene)

    return {scene, light, cam}
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

export function blendAnimv2(pl, toAnim, _anims, isLooping, afterEndDetail, _currentPlayingAnim) {
    let currentWeight = 1
    let newWeight = 0
    let desiredAnimIsPlaying = false
    pl.anims.forEach(anim => {
        if (anim.isPlaying) {
            if (anim.name === toAnim.name) return desiredAnimIsPlaying = true
        }
    })
    if (desiredAnimIsPlaying) return 
    let currentPlayingAnim
    if(_currentPlayingAnim) {currentPlayingAnim = _currentPlayingAnim
    }else currentPlayingAnim =  pl.anims.find(anim => anim.isPlaying)// idle anim
    
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

        if (newWeight >= 1) return clearInterval(pl.weightInterval)
    }, 30)
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
            createPlayer(pl, animationsGLB, scene, vrHands).then(newP => {
                players.push(newP)
                checkSceneModels()
            })            
        })
    }
}
export function checkSceneModels(){
    const state = getState()
    const scene = getScene()
    if(!scene) return log("scene not ready")
    if (state !== "GAME") return log('Game is still not ready')
    const sceneDescription = getAllImportedModelsInSocket()
    if (sceneDescription.length) {
        sceneDescription.forEach(socketModel => {
            const {pos,scale, _id} = socketModel
            const modelAlreadyHere = modelsInScene.find(sceneModel => sceneModel._id === socketModel._id)
            if (modelAlreadyHere) {                
                if(socketModel.parentMeshId){
                    const mesh = modelAlreadyHere.mesh
                    const parentPlayer = players.find(pl => pl._id === socketModel.parentMeshId)
                    if(parentPlayer) {
                        parentAMesh(mesh, parentPlayer.rHandMesh, {x:-0.02, y:-0.03, z:-0.08}, .11, {x:0.3118619785970446,y:-0.517518584933339,z:0.6331840797317805,w:0.48372982307105})  
                    }
                }
                return 
            }else{
                if(socketModel.type === "hlsurl"){
                    // Create the video element
                    var video = document.createElement("video");
                    video.autoplay = true;
                    video.playsInline = true;
                    video.src = desc.url;
                    video.id = desc._id
                    
                    console.log("Adding HTML video element");
                    document.body.appendChild(video);
                    // This is where you create and manipulate meshes
                    var TV = MeshBuilder.CreatePlane("myPlane", {width: 1.7, height: 1}, scene);
                    // TV.rotate(BABYLON.Axis.Z, Math.PI, BABYLON.Space.WORLD);
                    TV.position = new Vector3(pos.x,pos.y, pos.z)
                    TV.scaling = new Vector3(scale.x, scale.y, scale.z)
                    TV.id = desc._id
                    attachToGizmoArray(TV)
                    TV.rotate(Axis.Z, Math.PI, Space.WORLD);
                    TV.rotate(Axis.Y, Math.PI, Space.WORLD);
                    TV.actionManager = new ActionManager(scene);
                    if(getGizmo()) {
                        attachToGizmoArray(TV); 
                        // changeGizmo(false,false, true)
                    }
                
                    // Video material
                    const videoMat = new BABYLON.StandardMaterial("textVid", scene);
                    var video = document.querySelector('video');
                    video.style.width = "100px"
                    video.preload ="none"
                    var videoTexture = new BABYLON.VideoTexture('video', video, scene, true, true);
            
                    videoMat.backFaceCulling = false;
                    videoMat.diffuseTexture = videoTexture;
                    videoMat.emissiveColor = BABYLON.Color3.White();
                    TV.material = videoMat;
                    var htmlVideo = videoTexture.video;
            
                    if (Hls.isSupported()) {
                        var hls = new Hls();
                        hls.loadSource(desc.url);
                        hls.attachMedia(video);
                        
                        hls.on(Hls.Events.MANIFEST_PARSED,function() {
                            TV.actionManager.registerAction(
                                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger,
                                function(event) {
                                    htmlVideo.play();
                                    // changeGizmo(false, false, true)
                                })
                            );
                        });
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = desc.url;
                        
                        video.addEventListener('loadedmetadata',function() {
                            TV.actionManager.registerAction(
                                new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger,
                                function(event) {
                                    htmlVideo.play();
                                    // changeGizmo(false, false, true)
                                })
                            );
                        });
                    }
                    modelsInScene.push({...socketModel, mesh: TV})
                }    
                if(socketModel.type === "primitive"){
                    let model
                    let error=false
                    switch(socketModel.shape){
                        case "box":
                        model = MeshBuilder.CreateBox(socketModel.shape, { height: 2 }, scene)
                        break
                        case "cylinder":
                        model = MeshBuilder.CreateCylinder(socketModel.shape, { diameter: 2 }, scene)
                        break
                        default:
                        log("unsupported shape ", socketModel)
                        error = true
                        break
                    }
                    if(error) return
            
                    model.position = new Vector3(pos.x,pos.y,pos.z)
                    model.scaling = new Vector3(scale.x,scale.y,scale.z)
                    model.id = _id
    
                    attachToGizmoArray(model)
                    modelsInScene.push({...socketModel, mesh: model})
                // rotation implement here
                }
                if(socketModel.type === "remoteurl"){
                    log("importing model ")
                    importCustomModel(socketModel.url).then( avatar => {        
                        const Root = avatar.meshes[0]
                        const mainMesh = avatar.meshes[1]
                        mainMesh.parent = null
                        Root.dispose()
            
                        mainMesh.position = new Vector3(pos.x, pos.y, pos.z)
                        mainMesh.scaling = new Vector3(scale.x,scale.y,scale.z)
                        attachToGizmoArray(mainMesh)
                        mainMesh.id = socketModel._id
                        modelsInScene.push({...socketModel, mesh: mainMesh})
                        // lookAr direction here
                    })
                }
                if(socketModel.type === "equipment"){
                    importCustomModel(socketModel.url).then( model => {        
                        const Root = model.meshes[0]
                        const meshMat = scene.getMaterialByName(socketModel.modelName);
                        if(meshMat) model.meshes[1].material = meshMat
                        if(socketModel.parentMeshId){
                            const parentPlayer = players.find(pl => pl._id === socketModel.parentMeshId)
                            if(parentPlayer){
                                parentAMesh(Root, parentPlayer.rHandMesh, {x:-0.02, y:-0.03, z:-0.08}, .11, {x:0.3118619785970446,y:-0.517518584933339,z:0.6331840797317805,w:0.48372982307105})
                            }
                        }
                        model.meshes[1].name = `${socketModel.modelName}.${socketModel.parentMeshId}`
                        setMeshesVisibility(Root.getChildren(), socketModel.isVisible)
                        modelsInScene.push({...socketModel, mesh: Root})
                    }).catch(error => log(error))
                }                
            }
        })
    }
}
export function getPlayersInScene() {
    return players
}
export function getThingsInScene(){
    return modelsInScene
}
export function playerDispose(playerDetail) {
    log(playerDetail)
    const playerToDispose = players.find(pl => pl._id === playerDetail._id)
    if (playerToDispose) {
        log(playerToDispose)
        playerToDispose.anims.forEach(anim => anim.dispose())
        playerToDispose.mainBody?.getChildren()[0].dispose()
        playerToDispose.mainBody?.dispose()

        playerToDispose.leftHandControl?.dispose()
        playerToDispose.rightHandControl?.dispose()

        playerToDispose.rHandMesh?.dispose()
        playerToDispose.lHandMesh?.dispose()

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










// const menuScreen = createMenuVTwo(scene, false, {x:0, y:1.5, z:0})
    // setInterval(() => {
    //     const myChar = getCharacter()
    //     if(!myChar) return
    //     // menuScreen.node.addRotation(0,1,0) works
    //     const screenPos = menuScreen.position.clone()
    //     screenPos.y = myChar.mainBody.position.y
    //     const result = screenPos.subtract(myChar.mainBody.position).normalize()
    //     const angle = Math.atan2(result.x, result.z)
    //     menuScreen.node.rotation.y = angle
    // }, 1000)
    // createOptScreen(scene, false, {x:-1, y: 2,z:-2})

    // const manager = create3DGuiManager(scene)
    // const { checkBx, header } = createCheckBox("isVertical ? ", false, false, false, "40px", "40px", "blue")
    // const samplebtn = createThreeDBtn(manager, "Different", 40, .2, "./images/sword.png")    
    // samplebtn.position = new Vector3(-1,1.5,4)
    // const slate = createSlate("Inventory", manager, false, {x: 0, y: 1.8,z:2}, .4)

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



    // scene.onPointerObservable.add((e) => {
    //     if (e.type === PointerEventTypes.POINTERDOWN) {
    //         const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, Matrix.Identity(), scene.activeCamera);
    //         let pickInfo = scene.pickWithRay(ray);
    //         if(pickInfo){
    //             log(pickInfo.pickedMesh.name)
    //         }
    //         // if(pickInfo && pickInfo.pickedPoint){
    //         //     const mc = getCharacter()
    //         //     if(!mc) return log("no character")
    //         //     const point = pickInfo.pickedPoint
                
    //         //     const bonePos = mc.neckNode.getAbsolutePosition()
    //         //     var direction = point.subtract(bonePos);
    //         //     direction.normalize();
    //         //     var targetYaw = Math.atan2(direction.x, direction.z);
    //         //     mc.neckNode.rotate(BABYLON.Axis.Y, targetYaw);
    //         //     log(mc.neckNode.rotationQuaternion)
    //         //     mc.skeleton.prepare()
    //         //     // var diffX = point.x - mc.mainBody.position.x;
    //         //     // var diffY = point.z - mc.mainBody.position.z;
    //         //     // const angle = Math.atan2(diffX, diffY)
    //         //     // log(mc.skeleton)
    //         //     // mc.skeleton.bones.forEach(bone => {
    //         //     //     if(bone.name.includes("Neck")){
    //         //     //         var rotQ = new Quaternion.RotationYawPitchRoll(0, angle, 0);
    //         //     //         bone.setRotationQuaternion(rotQ, Space.WORLD)
    //         //     //         log(bone.rotationQuaternion)
    //         //     //     }
    //         //     // })
    //         // }
    //         // const clickedMeshName = pickInfo.pickedMesh.name.toLowerCase()
    //         // const clickedPos = pickInfo.pickedMesh.getAbsolutePosition()
    //         // const myDetail = getMyDetail()
    //         // const myMesh = scene.getMeshByName(`player.${myDetail._id}`)
    //         // if(!myMesh) return log('cannot find my mesh')
    //         // const currentPos = myMesh.position
    //         // log('will move')
    //         // emitMove({
    //         //     _id: myDetail._id, 
    //         //     movementName: "clickedTarget",
    //         //     loc: {x: currentPos.x, y: currentPos.y,z: currentPos.z}, 
    //         //     direction: {x: clickedPos.x, y: currentPos.y, z: clickedPos.z} 
    //         // })
    //     }
    // });

    
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