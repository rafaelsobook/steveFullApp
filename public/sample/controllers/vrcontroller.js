import { displayTxt } from "../createDisplay.js"
import { createShape, importCustomModel, setMeshesVisibility, setMeshPos } from "../creations.js"
import { create3DGuiManager, createNearMenu, createSlate, createThreeDBtn, createThreeDPanel, openClosePanel } from "../guitool/gui3dtool.js"
import { createButtonForHand } from "../guitool/guitool.js"
import { createMenuVOne, createMenuVTwo, getMenuScreen } from "../guitool/vrui.js"
import { getCharacter } from "../index.js"
import { createAggregate } from "../physics/aggregates.js"
import { emitMove, emitStop, getMyDetail, getSocket } from "../socket/socketLogic.js"
const { Vector3,Color3,MeshBuilder,Space, Axis,StandardMaterial,WebXRFeatureName, WebXRHandJoint, GizmoManager, Quaternion} = BABYLON
const log = console.log
let xrCam
export function getXrCam(){
    return xrCam
}
export async function initVrStickControls(scene, xr){
    let cam = xr.baseExperience.camera
    let myChar = getCharacter()
    const camPosY = 1.7
    const {text1, text2, nameMesh} = displayTxt(cam, scene)
    let isTriggeredStop = false
    let isUsingController = false

    let isCharacterAndCameraMade = setInterval( async () => {
        myChar = getCharacter()
        cam = xr.baseExperience.camera;

        if(myChar && cam){
            // log("isCharacterAndCameraMade Is Done checking ...")
            xrCam = cam
            clearInterval(isCharacterAndCameraMade)
            cam.checkCollisions = true
            let myPos = myChar.mainBody.position
            setMeshPos(cam, {x: myPos.x, y: camPosY, z: myPos.z})

            const socket = getSocket()
            //  HAND TRACKING
            try {
                const handFeature = xr.baseExperience.featuresManager.enableFeature(WebXRFeatureName.HAND_TRACKING, "latest", {
                    xrInput: xr.input
                })
                let rendererForHand
                let l_indxTip
                let l_middleTip
                let l_wrist
                
                let r_indxTip
                let r_wrist
                let leftJointMeshes = undefined
                let rightJointMeshes = undefined

                let l_vrhand
                let r_vrhand
                
                let tipBx
                handFeature.onHandAddedObservable.add( hand => {
                  
                    if(!myChar) return console.warn("fix error myCharacter not yet made and vr is loaded already")
                    myPos = myChar.mainBody.position
                    const side = hand.xrController.inputSource.handedness
                    cam.position.x = myPos.x
                    cam.position.y = myChar.headBone.getAbsolutePosition().y
                    cam.position.z = myPos.z
                    

                    if(side === "right" && r_wrist === undefined) {
                        r_vrhand = hand.handMesh
                        rightJointMeshes = hand._jointMeshes
                        myChar.rHandMesh.isVisible = false
                        r_indxTip = hand.getJointMesh(WebXRHandJoint.INDEX_FINGER_TIP)
                        r_wrist = hand.getJointMesh(WebXRHandJoint.WRIST)                        
                    }
                    if(side === "left" && l_wrist === undefined && !leftJointMeshes) {  
                        l_vrhand = hand.handMesh 
                        leftJointMeshes = hand._jointMeshes
                        myChar.lHandMesh.isVisible = false             
                        l_indxTip = hand.getJointMesh(WebXRHandJoint.INDEX_FINGER_TIP)                        
                        // tipBx.parent = l_indxTip
                        l_middleTip = hand.getJointMesh(WebXRHandJoint.MIDDLE_FINGER_TIP)
                        l_wrist = hand.getJointMesh(WebXRHandJoint.WRIST)                        
                    } 
                })
                handFeature.onHandRemovedObservable.add( () => {
                    const myDetail = getMyDetail()
                    socket.emit("hide-or-show-hands", {roomNum: myDetail.roomNum, _id: myDetail._id, isVisible: false})
                })
                
                // creation for VR UI Tools
                const toRotateBones = [...getControllableJoint("left"),...getControllableJoint("right")]
                // interval for checking if you have already loaded your vr hands in the scene
                // if it does we are going to attach UI in your hands and create other UI for your menu
                // the onHandAddedObservable triggers when you load your left or right hand. somtimes only the left or right hand is loaded we need both of them to be ready before we init all the UI
                
                let menuScreen = undefined
                let interval = setInterval(() => {
                    // log("searching for both hands")
                    if(r_wrist || l_wrist) { clearInterval(interval)
                        menuScreen = createMenuVTwo(scene, false)
                        tipBx = MeshBuilder.CreateSphere("asd", { diameter: .2/10, segments: 4}, scene);tipBx.isVisible =false
                        // const screen = createMenuVOne(scene, false)
                        menuScreen.isVisible = false
                        menuScreen.children.forEach(chldControl =>{
                            openClosePanel(chldControl, menuScreen.isVisible)
                        })
                        const r_wrist_btn = createButtonForHand("Menu", r_wrist, scene, tipBx, () => {
                            // screen.isVisible = !screen.isVisible
                           
                            
                            // screen.lookAt(cam.getFrontPosition(.1),0,0,0)
                            // screen.isVisible ? xr.pointerSelection.attach() : xr.pointerSelection.detach()

                            if(!menuScreen) return
                            
                            menuScreen.isVisible = !menuScreen.isVisible
                            menuScreen.children.forEach(chldControl =>{
                                // chldControl.isVisible = !chldControl.isVisible
                                openClosePanel(chldControl, menuScreen.isVisible)
                            })
                        })
                        r_wrist_btn.position = new Vector3(0,-2,0)
                        r_wrist_btn.addRotation(-Math.PI/2, Math.PI,0)                    }
                }, 100)

                let forwardDir = cam.getDirection(BABYLON.Vector3.Forward()).normalize();
                let camPosInWorld = {x: cam.position.x, y: camPosY, z: cam.position.z}


                let stopTimeOut
                let reloadingTimeout // for setting back isRealoading to false
                let isReloading = false // by default we are not reloading a bullet
                scene.onBeforeRenderObservable.remove(rendererForHand)
                rendererForHand = scene.onBeforeRenderObservable.add(() => {
                    const deltaT = scene.getEngine().getDeltaTime()/1000
                    if(xr.baseExperience.camera){
                        forwardDir = cam.getDirection(BABYLON.Vector3.Forward()).normalize();
                        camPosInWorld = {x: cam.position.x, y: camPosY, z: cam.position.z}
                        // log(dir)
                        // cam.position.addInPlace(new Vector3(forwardDir.x*deltaT, 0, forwardDir.z*deltaT))
                    }
                    if(menuScreen){
                        menuScreen.position = cam.getFrontPosition(.4)
                        menuScreen.node.lookAt(cam.position,0,0,0)
                        menuScreen.node.addRotation(0,Math.PI,0)
                    }
     
                    if(isUsingController) return
                    if(!l_wrist || !r_wrist) return 
                    if(!myChar) return
                
                    const camFrontWorldPos = cam.getFrontPosition(2)
      
                    const lWristPos = l_wrist.position
                    const rWristPos = r_wrist.position

                    const lWristQuat = l_wrist.rotationQuaternion;
                    const rWristQuat = r_wrist.rotationQuaternion;

                    if(tipBx) tipBx.position = l_indxTip.getAbsolutePosition()

                    myChar.lHand.position = lWristPos
                    myChar.rHand.position = rWristPos

                    myChar.lHand.rotationQuaternion = lWristQuat
                    myChar.rHand.rotationQuaternion = rWristQuat

                    // btn.position = r_wrist.getAbsolutePosition()

                    if(leftJointMeshes && rightJointMeshes){
                        // log(l_indxTip.rotationQuaternion)
                        // log(`vrIndxPosX: ${l_indxTip.position.x}, vrIndxAbsPosX: ${l_indxTip.getAbsolutePosition().x}`)
                        let fingerCoord = []
                        leftJointMeshes.forEach(joint => {
                            const isBoneNotValid = toRotateBones.some(bneName => bneName === joint.name)
                            if(!isBoneNotValid) return 
                            const bone = myChar.lHandBones.find(bone => bone.name === joint.name)
                            if(!bone) return 
                            const boneNode = bone.getTransformNode()

                            const wristRotation = myChar.lHand.rotationQuaternion
                            const fingerRotation = joint.rotationQuaternion;
                            
                            const jointAbsPos = joint.getAbsolutePosition()
                            boneNode.setAbsolutePosition(new Vector3(jointAbsPos.x,jointAbsPos.y,jointAbsPos.z))
                            // boneNode.position =jointAbsPos
                            fingerCoord.push({name: bone.name, x: jointAbsPos.x,y:jointAbsPos.y,z:jointAbsPos.z})
                        })
                        rightJointMeshes.forEach(joint => {
                            const isBoneNotValid = toRotateBones.some(bneName => bneName === joint.name)
                            if(!isBoneNotValid) return 
                            const bone = myChar.rHandBones.find(bone => bone.name === joint.name)
                            if(!bone) return 
                            const boneNode = bone.getTransformNode()

                            const wristRotation = myChar.lHand.rotationQuaternion
                            const fingerRotation = joint.rotationQuaternion;
                            
                            const jointAbsPos = joint.getAbsolutePosition()
                            boneNode.setAbsolutePosition(new Vector3(jointAbsPos.x,jointAbsPos.y,jointAbsPos.z))
                            // boneNode.position =jointAbsPos
                            fingerCoord.push({name: bone.name, x: jointAbsPos.x,y:jointAbsPos.y,z:jointAbsPos.z})
                        })
                        const camQ = cam.rotationQuaternion
                        socket.emit("moving-hands", {
                            _id: myChar._id,
                            wristPos: { 
                                left: { x: lWristPos.x, y:lWristPos.y, z: lWristPos.z }, 
                                right: { x: rWristPos.x, y:rWristPos.y, z: rWristPos.z } 
                            },
                            wristQuat:{ 
                                left: { x: lWristQuat.x, y:lWristQuat.y, z: lWristQuat.z, w: lWristQuat.w }, 
                                right: { x: rWristQuat.x, y:rWristQuat.y, z: rWristQuat.z, w: rWristQuat.w } 
                            },
                            fingerCoord,
                            camQuat: {x: camQ.x, y:camQ.y, z:camQ.z},
                            headDirection: {x: camFrontWorldPos.x, y: camFrontWorldPos.y, z: camFrontWorldPos.z}
                        })
                    }        
                    
                    let indxAndMiddleDistance = Vector3.Distance(l_indxTip.position, l_middleTip.position)

                    let indxAndWristDist = Vector3.Distance(r_indxTip.position, r_wrist.position)
                    let middleAndWristDist = Vector3.Distance(l_middleTip.position, l_wrist.position)

                    let forwardDirection = new Vector3(0, 0, 100); // Forward in local space
                    let frontPos = Vector3.TransformNormal(forwardDirection, cam.getWorldMatrix());
                    const cPos = myChar.mainBody.position
                    // const tPos = {x:cPos.x + frontPos.x , y: 1, z:cPos.z + frontPos.z}
                    const tPos = {x: camFrontWorldPos.x, y: camPosY, z: camFrontWorldPos.z}

                    const camPosClone = cam.position.clone()
                    camPosClone.y = myChar.mainBody.position.y
                    const distance = Vector3.Distance(myChar.mainBody.position, camPosClone)

                    cam.position.y = myChar.headBone.getAbsolutePosition().y
                    
                    // log(`distance from XRCamera ${parseFloat(distance)}`)
                    // log(distance)

                    if(indxAndWristDist <= 0.09){
                        const gunMesh = scene.getMeshByName(`gun.${myChar._id}`)                        
                        
                        if(gunMesh && gunMesh.isVisible){
                            if(isReloading) return
                            isReloading = true
                            const respawnPos = Vector3.TransformCoordinates(new Vector3(-2.5,.5,0), gunMesh.computeWorldMatrix(true))
                            const targDir = Vector3.TransformCoordinates(new Vector3(-15.5,.5,0), gunMesh.computeWorldMatrix(true))
                            const normalizedV = { x: targDir.x - respawnPos.x, y: targDir.y-respawnPos.y, z: targDir.z - respawnPos.z}
                            // const bx = createShape({size:.1, depth: .3}, respawnPos, "bxo")
                            // bx.lookAt(new Vector3(targDir.x, targDir.y, targDir.z),0,0,0)
                            // setTimeout(() => bx.dispose(), 100)
                            
                            socket.emit("trigger-bullet", { 
                                pos: {x: respawnPos.x, y: respawnPos.y, z: respawnPos.z},
                                dir: normalizedV,
                                roomNum: getMyDetail().roomNum
                            })
                            
                        
                            clearTimeout(reloadingTimeout)
                            reloadingTimeout = setTimeout(() => {
                                isReloading = false
                            }, 1500)
                        }

                        
                        // const bx = createShape({size:.1, depth: .3}, respawnPos, "bxo")
                        // bx.lookAt(new Vector3(targDir.x, targDir.y, targDir.z),0,0,0)
                        // setTimeout(() => bx.dispose(), 100)
                        // text1.text = `resPos: ${respawnPos.x, respawnPos.y, respawnPos.z}`
                        
                        return 
                    }

                    if(indxAndMiddleDistance <= 0.02){
                       
                        // emitMove({
                        //     _id: myChar._id,
                        //     movement: { moveX: 0, moveZ: 1 },
                        //     direction: {x:cPos.x + frontPos.x , y: cam.position.y, z:cPos.z + frontPos.z},
                        //     camPosInWorld: false,
                        //     // wristPos: { 
                        //     //     left: { x: lWristPos.x, y:lWristPos.y, z: lWristPos.z }, 
                        //     //     right: { x: rWristPos.x, y:rWristPos.y, z: rWristPos.z } 
                        //     // },
                        //     controllerType: 'vr-hands'
                        // })
                        // clearTimeout(stopTimeOut)
                        // stopTimeOut = setTimeout(() => {
                        //     emitStop({
                        //         _id: myChar._id,
                        //         movement: { moveX: 0, moveZ: 0 },
                        //         loc: {x: cPos.x, y: cPos.y, z: cPos.z},
                        //         direction: {x:cPos.x + frontPos.x , y: cam.position.y, z:cPos.z + frontPos.z},
                        //         controllerType: 'vr-hands',
                        //         camPosInWorld: false
                        //     })
                        // }, 100)
                    
                        return
                    }

                    if(distance > 0.06){
                        emitMove({
                            _id: myChar._id,
                            movement: { moveX: 0, moveZ: 0 },
                            direction: tPos,
                            camPosInWorld,
                            // wristPos: { 
                            //     left: { x: lWristPos.x, y:lWristPos.y, z: lWristPos.z }, 
                            //     right: { x: rWristPos.x, y:rWristPos.y, z: rWristPos.z } 
                            // },
                            controllerType: 'vr-hands'
                        }) 
                        clearTimeout(stopTimeOut)
                        stopTimeOut = setTimeout(() => {
                            emitStop({
                                _id: myChar._id,
                                movement: { moveX: 0, moveZ: 0 },
                                loc: {x: cPos.x, y: cPos.y, z: cPos.z},
                                direction: tPos,
                                controllerType: 'vr-hands',
                                camPosInWorld
                            })
                        }, 100)
                    }
                    
                    // emitMove({
                    //     _id: myChar._id,
                    //     movement: { moveX: 0, moveZ: 1 },
                    //     direction: tPos,
                    //     camPosInWorld,
                    //     // wristPos: { 
                    //     //     left: { x: lWristPos.x, y:lWristPos.y, z: lWristPos.z }, 
                    //     //     right: { x: rWristPos.x, y:rWristPos.y, z: rWristPos.z } 
                    //     // },
                    //     controllerType: 'vr-hands'
                    // }) 
                    
                    // text1.text = `camX ${parseFloat(camPosInWorld.x)}, camZ: ${camPosInWorld.z}`
                })
            } catch (error) {
                log(error)
            }
        }
    }, 100)
    // for motion controllers
    xr.input.onControllerAddedObservable.add(controller => {
        controller.onMotionControllerInitObservable.add(mc => {
            myChar = getCharacter()   
            cam = xr.baseExperience.camera;
            const myPos = myChar.mainBody.position
            nameMesh.isVisible = false
            if(!myChar) return 
            setMeshesVisibility(myChar.root.getChildren()[0].getChildren(), false)
            cam.position.x = myPos.x
            cam.position.y = camPosY
            cam.position.z = myPos.z
            // if(myChar.headBone) cam.parent = myChar.headBone
            if(mc.handedness === "left"){
                let thumbstickComponent = mc.getComponent(mc.getComponentIds()[2]);
                // log(thumbstickComponent)
                if(!thumbstickComponent) return 
                // log("thumbstickComponent is FOUND !")
                thumbstickComponent.onButtonStateChangedObservable.add(() => { 
                  
                })
                
                thumbstickComponent.onAxisValueChangedObservable.add((axes) => {
                    
                    myChar = getCharacter()
                    if(!myChar) return
                    
                    // The forward direction can be calculated by transforming a forward vector
                    let forwardDirection = new Vector3(0, 0, 100); // Forward in local space
                    let frontPos = Vector3.TransformNormal(forwardDirection, cam.getWorldMatrix());
                    const cPos = myChar.mainBody.position
                    const tPos = {x:cPos.x + frontPos.x , y: cPos.y, z:cPos.z + frontPos.z}
                    // nameMesh.position = frontPos;
                    // text1.text = `x:${axes.x}, y: ${axes.y * -1}`
                    // const absoluteFrontPos = cam.getFrontPosition(1.5)
                    // nameMesh.position = absoluteFrontPos;
                    // text1.text = `x:${axes.x}, y: ${axes.y }`
                    // text1.text = `_id: ${myChar._id}`
                    cam.position.x = cPos.x
                    cam.position.y = myChar.headBone.getAbsolutePosition().y
                    cam.position.z = cPos.z
                    if(axes.x === 0 && axes.y === 0){
                        if(isTriggeredStop) return 
                        emitStop({
                            _id: myChar._id,
                            movement: { moveX: 0, moveZ: 0 },
                            loc: {x: cPos.x, y: cPos.y, z: cPos.z},
                            direction: tPos,
                            controllerType: 'mobile-joystick'
                        })
                        isUsingController = false
                        return isTriggeredStop = true
                    }
                    isTriggeredStop = false
                    isUsingController = true
                    emitMove({
                        _id: myChar._id,
                        movement: { moveX: axes.x, moveZ: axes.y *-1 },
                        direction: tPos,
                        controllerType: 'mobile-joystick',
                        wristPos: false,
                        wristQuat:false
                    }) 
                })          
                
            }
        })
    })
}

function createBullet(respawnPos, targetDirection){

    const bullet = createShape({ diameter: .1}, {x:respawnPos.x, y:respawnPos.y, z: respawnPos.z}, "sphere", "sphere")
    isReloading = true
    let force = 10

    const agg = createAggregate(bullet, {mass: .5}, "sphere")
    const vel = new Vector3(targetDirection.x*force, targetDirection.y*force, targetDirection.z*force)
    agg.body.applyImpulse(vel, bullet.getAbsolutePosition())
}
function inspectToString(obj) {
    
    // Custom replacer function for JSON.stringify to handle complex types
    function replacer(key, value) {
        // if (typeof value === 'object' && value !== null) {
        //     // Handle circular references
        //     if (seen.has(value)) return '[Circular]';
        //     seen.add(value);
        // }
        // if (typeof value === 'function') {
        //     return value.toString(); // Convert function to its string representation
        // }
        // if (typeof value === 'symbol') {
        //     return value.toString(); // Convert symbol to its string representation
        // }
        // if (value instanceof Set) {
        //     return `Set(${[...value].join(', ')})`; // Convert Set to a string
        // }
        // if (value instanceof Map) {
        //     return `Map(${[...value.entries()].map(([k, v]) => `${k}: ${v}`).join(', ')})`; // Convert Map to string
        // }
    
      return value; // For other types, use default behavior
    }
  
    const seen = new WeakSet(); // To track circular references
    return JSON.stringify(obj, replacer, 2); // Pretty print with indentation
  }


  function getHandRigArray(handedness){
    return [
        "wrist_",
        "thumb_metacarpal_",
        "thumb_proxPhalanx_",
        "thumb_distPhalanx_",
        "thumb_tip_",
        "index_metacarpal_",
        "index_proxPhalanx_",
        "index_intPhalanx_",
        "index_distPhalanx_",
        "index_tip_",
        "middle_metacarpal_",
        "middle_proxPhalanx_",
        "middle_intPhalanx_",
        "middle_distPhalanx_",
        "middle_tip_",
        "ring_metacarpal_",
        "ring_proxPhalanx_",
        "ring_intPhalanx_",
        "ring_distPhalanx_",
        "ring_tip_",
        "little_metacarpal_",
        "little_proxPhalanx_",
        "little_intPhalanx_",
        "little_distPhalanx_",
        "little_tip_",
      ].map((joint) => `${joint}${handedness === "right" ? "R" : "L"}`);
  }

  function getControllableJoint(sideName){
      return  [
            "-handJoint-7",
            "-handJoint-12",
            "-handJoint-17",
            "-handJoint-22",

            "-handJoint-8",
            "-handJoint-18",
            "-handJoint-23",
            "-handJoint-13",

            "-handJoint-24",
            "-handJoint-19",
            "-handJoint-14",
            "-handJoint-9",

            "-handJoint-3",
            "-handJoint-4",

            // "left-handJoint-15",
            // "left-handJoint-20",

            // "left-handJoint-2",
            // "left-handJoint-6",
            // "left-handJoint-11",
            // "left-handJoint-16",
            // "left-handJoint-21"
        ].map( jointName => `${sideName}${jointName}`)
  }









//   const guiManager = new BABYLON.GUI.GUI3DManager(scene);
//   const button = new BABYLON.GUI.HolographicButton("myButton");
//   guiManager.addControl(button);
//   button.text = "Press Me!";
//   button.scaling = new BABYLON.Vector3(0.2, 0.2, 0.2);  // Make the button smaller

//   // Make the button interactable with near picking
//   button.isNearPickable = true;   // This enables near interactions (for WebXR hand tracking)
//   button.isPointerBlocker = true; // Ensures the button blocks pointer events

//   // Add action on button click
//   button.onPointerDownObservable.add(() => {
//       console.log("Button pressed!");
//   });