const {Quaternion,Color3, Space,Axis, SkyMaterial,Debug, BoneIKController, GizmoManager,Scalar,HavokPlugin,PhysicsAggregate,PhysicsShapeType, ActionManager,ExecuteCodeAction, StandardMaterial,Texture, MeshBuilder, Matrix, PointerEventTypes, Mesh, Animation, SceneLoader, Scene, Vector3, ArcRotateCamera, HemisphericLight } = BABYLON

import { initKeyControls } from '../controllers/keycontroller.js'
import { initJoyStick } from '../controllers/thumbController.js'
import { initAudioControl } from '../controllers/audioController.js'
import { getXrCam, initVrStickControls } from '../controllers/vrcontroller.js'
import { createGizmo, createMat, createShape, createPlayer, importCustomModel, importModelContainer, parentAMesh, setMeshesVisibility, createBullet } from '../creations.js'
// import { getSelectedImmMode } from '../dropdown.js'
import { attachToGizmoArray } from '../guitool/gizmos.js'
import { create3DGuiManager, createNearMenu, createSlate, createThreeDBtn, createThreeDPanel } from '../guitool/gui3dtool.js'
import { bylonUIInit, createCheckBox } from '../guitool/guitool.js'
import { getCharacter, getState, setState } from '../index.js'
import { createAggregate } from '../physics/aggregates.js'
import { emitMove, getAllImportedModelsInSocket, getAllPlayersInSocket, getMyDetail, getSocket } from '../socket/socketLogic.js'
import { assignGroup, filterCollideMask, FILTER_GROUP_OWNER_CAPSULE, FILTER_GROUP_REMOTE_DESCRIPTION } from '../physics/filterGroup.js'
import { setImmersiveState } from '../immersive/immersiveState.js'
import { createInventoryUI2D } from '../inventory.js'
const log = console.log

let players = []
let modelsInScene = []

// necessities to create player
let scene
let animationsGLB = []
let vrHands = {
    right: undefined,
    left: undefined
}

let itemCollideTimeout = {} // a key value for item that collided needs to be disabled and then after certain sec collision will be enabled again. this is because when not turned off the collision is lagging the browser because of continues collision to self

export function getScene() {
    return scene
}

export async function createScene(_engine) {
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
    const ADT = bylonUIInit()
    createInventoryUI2D(ADT)
    createGizmo(scene, false, true, false, false, false)

    await importAnimations("idle_anim.glb")
    await importAnimations("walk_anim.glb") //1
    // await importAnimations("jump_anim.glb")
    await importAnimations("jump_new.glb")
    await importAnimations("walkback_anim.glb");


    let sessionMode = "immersive-vr"
    // let sessionMode = "inline"

    const xrHelper = await scene.createDefaultXRExperienceAsync({
        // floorMeshes: [ground],
        uiOptions: {
            sessionMode
        },
        disableTeleportation: true
    })
    xrHelper.baseExperience.onStateChangedObservable.add(state => {
        
        if(state === BABYLON.WebXRState.IN_XR) {
            setImmersiveState(sessionMode)
        }else if(state === BABYLON.WebXRState.NOT_IN_XR) {
            setImmersiveState("browser")
        }
    })
    await scene.whenReadyAsync()
    create3DGuiManager(scene)
    setState("GAME")
    checkPlayers() // avatarUrl of everyplayers
    checkSceneModels()
    getCharacter()

    initJoyStick(getSocket(), cam, scene)
    initAudioControl(cam)
    initKeyControls(scene)
    await initVrStickControls(scene, xrHelper)

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
            const {pos,scale,rotQ, _id,physicsInfo, materialInfo} = socketModel
            const modelAlreadyHere = modelsInScene.find(sceneModel => sceneModel._id === socketModel._id)
            if (modelAlreadyHere) {                        
                if(socketModel.parentMeshId){ // for equipments
                    const mesh = modelAlreadyHere.mesh
                    const parentPlayer = players.find(pl => pl._id === socketModel.parentMeshId)
                    if(parentPlayer) {
                        if(modelAlreadyHere.aggregate) modelAlreadyHere.aggregate.body.setCollisionCallbackEnabled(true)
                        parentAMesh(mesh, parentPlayer.rHandMesh, {x:-0.02, y:-0.03, z:-0.08}, .11, {x:0.3118619785970446,y:-0.517518584933339,z:0.6331840797317805,w:0.48372982307105})  
                    } else {
                        if(modelAlreadyHere.aggregate) {
                            modelAlreadyHere.aggregate.body.setCollisionCallbackEnabled(false)
                            modelAlreadyHere.aggregate.body.disable()
                        }
                        if(mesh) setMeshesVisibility([mesh], false)
                    }
                }else{
                    // log(`already created in scene ${socketModel._id}`)
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
                    const model = createShape(socketModel.shapeOpt, socketModel.pos,socketModel.modelName, socketModel.shape)
        
                    if(!model) return log("error")
                    if(materialInfo){
                        const mat = createMat(scene, socketModel.modelName, materialInfo.texture)
                        mat.diffuseTexture.uScale = materialInfo.uAndVScale
                        mat.diffuseTexture.vScale = materialInfo.uAndVScale
                        model.material = mat
                    }                    
            
                    model.position = new Vector3(pos.x,pos.y,pos.z)
                    model.scaling = new Vector3(scale.x,scale.y,scale.z)
                    model.id = _id
    
                    if(socketModel.hasGizmos) attachToGizmoArray(model)
                    modelsInScene.push({...socketModel, mesh: model})
     
                    if(physicsInfo.enabled){
                        const agg = createAggregate(model, {mass: physicsInfo.mass}, physicsInfo.physicsType)
                        agg.body.disablePreStep = false
                        assignGroup(agg, FILTER_GROUP_REMOTE_DESCRIPTION)
                    }
                // rotation implement here
                }
                if(socketModel.type === "remoteurl"){
                    // careful in this part. will check on top if this mesh is created if not will create.
                    // this mesh will only be part of modelscene after the async so on the top this mesh will always not be created
                    // so after this mesh finish on creating the model will check again if there is a duplicate mesh

                    importCustomModel(socketModel.url).then( model => {
                        
                        const Root = model.meshes[0]
                        model.skeletons.length && model.skeletons.forEach(skeleton => {
                            skeleton.dispose(); // Dispose of skeletons if they’re no longer needed
                        });
                        const alreadyHere = modelsInScene.find(sceneModel => sceneModel._id === socketModel._id)
                        if(alreadyHere) return model.meshes.forEach(mesh => mesh.dispose())
                        
                        const mergeableMeshes = model.meshes.filter(mesh => mesh.name !== "__root__");
                        mergeableMeshes.forEach(mesh =>{
                            mesh.parent = null                           
                            if(mesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind)){
                                mesh.setVerticesData(BABYLON.VertexBuffer.TangentKind, null, false);
                            }
                        })
                        Root.dispose()
                        var mainMesh = BABYLON.Mesh.MergeMeshes(mergeableMeshes, true, true, undefined, false, true);
                        
                        mainMesh.scaling = new Vector3(scale.x,scale.y,scale.z)
                        mainMesh.position = new Vector3(pos.x, pos.y, pos.z)
                        // if(rotQ) mainMesh.rotationQuaternion = new Quaternion(rotQ.x,rotQ.y,rotQ.z, rotQ.w)
                        
                        mainMesh.id = socketModel._id

                        attachToGizmoArray(mainMesh)
                        modelsInScene.push({...socketModel, mesh: mainMesh})

                        if(physicsInfo.enabled){
                            const agg = createAggregate(mainMesh, {mass: physicsInfo.mass}, physicsInfo.physicsType)
                            agg.body.disablePreStep = false
                        }
                        
                    })
                }
                if(socketModel.type === "equipment"){
                    // careful in this part. will check on top if this mesh is created if not will create.
                    // this mesh will only be part of modelscene after the async so on the top this mesh will always not be created
                    // so after this mesh finish on creating the model will check again if there is a duplicate mesh
                    importCustomModel(socketModel.url).then( model => {        
                        log(socketModel)
                        const Root = model.meshes[0]
                        const alreadyHere = modelsInScene.find(sceneModel => sceneModel._id === socketModel._id)
                        if(alreadyHere) {
                            model.meshes.forEach(mesh => mesh.dispose())
                            return Root.dispose()
                        }
                        const mergeableMeshes = model.meshes.filter(mesh => mesh.name !== "__root__");
                        mergeableMeshes.forEach(mesh =>{
                            mesh.parent = null                           
                            if(mesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind)){
                                mesh.setVerticesData(BABYLON.VertexBuffer.TangentKind, null, false);
                            }
                        })
                        Root.dispose()
                        var equipmentMesh = BABYLON.Mesh.MergeMeshes(mergeableMeshes, true, true, undefined, false, true);
                        // setting mesh name
                        equipmentMesh.name = `${socketModel._id}.${socketModel.parentMeshId}`

                        log("creating physics for " + equipmentMesh.name)
                        const agg = createAggregate(equipmentMesh, {mass:0}, "mesh")
                        // agg.body.setMotionType(BABYLON.PhysicsMotionType.DYNAMIC)
                        if(socketModel.modelName.includes("sword")){
                            agg.body.disablePreStep = false
                            agg.body.setCollisionCallbackEnabled(true)
                            agg.body.getCollisionObservable().add( e => {
                                if(equipmentMesh && !equipmentMesh.isVisible) return log("not visible")
                                const hitMesh = e.collidedAgainst.transformNode
                                const ownerCapsuleName = `player.${equipmentMesh.name.split(".")[1]}`
                                // log(hitMesh.name)
                                // log(ownerCapsuleName)
                                if(hitMesh.name === ownerCapsuleName) return log("colliding with owner")
                                if(e.type === BABYLON.PhysicsEventType.COLLISION_STARTED){
                                    log(`i hit ${hitMesh.name}`)                                
                                    log(`i hit ${hitMesh.id}`)                                
                                }
                            })
                        }
                        
                        // filterCollideMask(agg, FILTER_GROUP_REMOTE_DESCRIPTION)
                        if(materialInfo){
                            equipmentMesh.material = createMat(scene, socketModel.modelName, materialInfo.diffuse, materialInfo.normal,materialInfo.rough)
                        }
                        
                        setMeshesVisibility([equipmentMesh], socketModel.isVisible)
                        modelsInScene.push({...socketModel, mesh: equipmentMesh, aggregate: agg})

                        if(socketModel.parentMeshId){
                            const parentPlayer = players.find(pl => pl._id === socketModel.parentMeshId)
                            if(parentPlayer){
                                parentPlayer.playerAgg
                                // assignGroup(parentPlayer.playerAgg, FILTER_GROUP_OWNER_CAPSULE)
                                parentAMesh(equipmentMesh, parentPlayer.rHandMesh, {x:-0.02, y:-0.03, z:-0.08}, .11, {x:0.3118619785970446,y:-0.517518584933339,z:0.6331840797317805,w:0.48372982307105})
                            } else {
                                
                                // agg.body.setCollisionCallbackEnabled(false)
                                agg.body.disable()
                                
                                setMeshesVisibility([equipmentMesh], false)
                            }
                        }
                        
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
    const playerToDispose = players.find(pl => pl._id === playerDetail._id)
    if (playerToDispose) {
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
export function disposeModelInScene(parentMeshId){
    const modelToDispose = modelsInScene.find(model => model.parentMeshId === parentMeshId)
    if(modelToDispose){
        log("there is model to dispose")

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


function createHandMat(scene, isLight){
    var handMat = new StandardMaterial("handMat", scene);
    handMat.diffuseColor = new Color3(0.8, 0.6, 0.5);  // Skin tone colo
    if(isLight) handMat.emissiveColor = new Color3(1.0, 0.8, 0.6);  // Emissive glow color
    handMat.specularColor = new Color3(0,0,0)
    handMat.backFaceCulling = true
    return handMat
}