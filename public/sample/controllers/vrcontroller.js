import { displayTxt } from "../createDisplay.js"
import { importCustomModel, setMeshesVisibility } from "../creations.js"
import { createButtonForHand } from "../guitool/guitool.js"
import { createOptScreen } from "../guitool/vrui.js"
import { getCharacter } from "../index.js"
import { emitMove, emitStop, getSocket } from "../socket/socketLogic.js"
const { Vector3,Color3,MeshBuilder, Axis,StandardMaterial,WebXRFeatureName, WebXRHandJoint, GizmoManager, Quaternion} = BABYLON
const log = console.log

export async function initVrStickControls(scene, xr){
    let cam = xr.baseExperience.camera
    let myChar = getCharacter()
    const camPosY = 1.7
    // Create a material
   

    const {text1, text2, nameMesh} = displayTxt(cam, scene)

   
    let isTriggeredStop = false
    let isUsingController = false
    // for motion controllers
    xr.input.onControllerAddedObservable.add(controller => {
        controller.onMotionControllerInitObservable.add(mc => {
            myChar = getCharacter()   
            cam = xr.baseExperience.camera;
            const myPos = myChar.mainBody.position
            
            nameMesh.position = cam.position;
            nameMesh.position.z += 1
            if(!myChar) return log("not found character")
            setMeshesVisibility(myChar.root.getChildren()[0].getChildren(), false)
            cam.position.x = myPos.x
            cam.position.y = camPosY
            cam.position.z = myPos.z
            if(mc.handedness === "left"){
                let thumbstickComponent = mc.getComponent(mc.getComponentIds()[2]);
                log(thumbstickComponent)
                if(!thumbstickComponent) return log("thumbstickComponent not found")
                log("thumbstickComponent is FOUND !")
                thumbstickComponent.onButtonStateChangedObservable.add(() => { 
                  
                })
                
                thumbstickComponent.onAxisValueChangedObservable.add((axes) => {
                    
                    myChar = getCharacter()
                    if(!myChar) return
                    // const frontPos = cam.getFrontPosition(2)
                    
                    // The forward direction can be calculated by transforming a forward vector
                    let forwardDirection = new Vector3(0, 0, 100); // Forward in local space
                    let frontPos = Vector3.TransformNormal(forwardDirection, cam.getWorldMatrix());
                    const cPos = myChar.mainBody.position
                    const tPos = {x:cPos.x + frontPos.x , y: 1, z:cPos.z + frontPos.z}
                    nameMesh.position = frontPos;
                    // text1.text = `x:${axes.x}, y: ${axes.y * -1}`
                    const absoluteFrontPos = cam.getFrontPosition(1.5)
                    nameMesh.position = absoluteFrontPos;
                    text1.text = `x:${axes.x}, y: ${axes.y }`
                    // text1.text = `_id: ${myChar._id}`
                    cam.position.x = cPos.x
                    cam.position.y = camPosY
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
    //  HAND TRACKING
    try {
        const handFeature = xr.baseExperience.featuresManager.enableFeature(WebXRFeatureName.HAND_TRACKING, "latest", {
            xrInput: xr.input
        })
        let rendererForHand
        let l_indxTip
        let l_middleTip
        let l_wrist

        let r_wrist
        let leftJointMeshes = undefined
        let rightJointMeshes = undefined
        

        const gm = new GizmoManager(scene, 1)
        gm.positionGizmoEnabled = true
        gm.usePointerToAttachGizmos = true;
        gm.gizmos.positionGizmo.xGizmo.isNearPickable = true;
        gm.gizmos.positionGizmo.yGizmo.isNearPickable = true;
        gm.gizmos.positionGizmo.zGizmo.isNearPickable = true;

        let l_vrhand
        let r_vrhand
        
        let tipBx
        handFeature.onHandAddedObservable.add( hand => {
            // hand.handMesh.material = handMat
            // log(hand.handMesh.material)
            myChar = getCharacter()               

            const myPos = myChar.mainBody.position
            const side = hand.xrController.inputSource.handedness
            cam.position.x = myPos.x
            cam.position.y = camPosY
            cam.position.z = myPos.z
            
            nameMesh.position = cam.getFrontPosition(2) 

            if(side === "right" && r_wrist === undefined) {
                r_vrhand = hand.handMesh
                rightJointMeshes = hand._jointMeshes
                myChar.rHandMesh.isVisible = false
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
                gm.attachToMesh(myChar.lHandMesh)
            } 
        })
        // handFeature.onHandRemovedObservable.add( () => {
        //     // scene.useRightHandedSystem = false
        //     // gr.addRotation(Math.PI,0,0)
        //     log("detected hand removed")
        // })

        const socket = getSocket()
        // const toRotateBones = [
        //     "left-handJoint-7",
        //     "left-handJoint-12",
        //     "left-handJoint-17",
        //     "left-handJoint-22",

        //     "left-handJoint-8",
        //     "left-handJoint-18",
        //     "left-handJoint-23",
        //     "left-handJoint-13",

        //     "left-handJoint-24",
        //     "left-handJoint-19",
        //     "left-handJoint-14",
        //     "left-handJoint-9",

        //     "left-handJoint-3",
        //     "left-handJoint-4",

        //     // "left-handJoint-15",
        //     // "left-handJoint-20",

        //     // "left-handJoint-2",
        //     // "left-handJoint-6",
        //     // "left-handJoint-11",
        //     // "left-handJoint-16",
        //     // "left-handJoint-21"
        // ]
        

        // creation for VR UI Tools
        const toRotateBones = [...getControllableJoint("left"),...getControllableJoint("right")]
        log(toRotateBones)
        let interval = setInterval(() => {
            log("searching for both hands")
            if(r_wrist || l_wrist) { clearInterval(interval)   
                
                
                tipBx = MeshBuilder.CreateSphere("asd", { diameter: .2/10, segments: 4}, scene);tipBx.isVisible =false
                const screen = createOptScreen(scene, false)
                const r_wrist_btn = createButtonForHand("Menu", r_wrist, scene, tipBx, () => {
                    screen.isVisible = !screen.isVisible
                    screen.position = cam.getFrontPosition(1.1)
                    screen.lookAt(cam.getFrontPosition(.1),0,0,0)
                    log(screen)
                })

                r_wrist_btn.position = new Vector3(0,-2,0)
                r_wrist_btn.addRotation(-Math.PI/2, Math.PI,0)
            }
        }, 100)

        
        scene.onBeforeRenderObservable.remove(rendererForHand)
        rendererForHand = scene.onBeforeRenderObservable.add(() => {
            
            if(isUsingController) return
            if(!l_wrist || !r_wrist) return 
            if(!myChar) return
           
            const camFrontWorldPos = cam.getFrontPosition(2)
            nameMesh.position = camFrontWorldPos

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
 
            // text1.text = `lwristPosX: ${l_wrist.position.x} rWristPos: ${r_wrist.position.x}`
           
            let indxAndMiddleDistance = Vector3.Distance(l_indxTip.position, l_middleTip.position)
            text1.text = `distance ${indxAndMiddleDistance}`
            let forwardDirection = new Vector3(0, 0, 100); // Forward in local space
            let frontPos = Vector3.TransformNormal(forwardDirection, cam.getWorldMatrix());
            const cPos = myChar.mainBody.position
            const tPos = {x:cPos.x + frontPos.x , y: 1, z:cPos.z + frontPos.z}
            if(indxAndMiddleDistance > 0.02) {                    
                if(isTriggeredStop) return
                emitStop({
                    _id: myChar._id,
                    movement: { moveX: 0, moveZ: 0 },
                    loc: {x: cPos.x, y: cPos.y, z: cPos.z},
                    direction: tPos,
                    controllerType: 'mobile-joystick'
                })
                return isTriggeredStop = true                        
            }
            isTriggeredStop = false
          
            emitMove({
                _id: myChar._id,
                movement: { moveX: 0, moveZ: 1 },
                direction: tPos,
                // wristPos: { 
                //     left: { x: lWristPos.x, y:lWristPos.y, z: lWristPos.z }, 
                //     right: { x: rWristPos.x, y:rWristPos.y, z: rWristPos.z } 
                // },
                controllerType: 'mobile-joystick'
            }) 
            cam.position.x = cPos.x
            cam.position.y = camPosY
            cam.position.z = cPos.z
            text1.text = `cPos ${cPos.x}, tPos: ${tPos.x}`
        })
    } catch (error) {
        log(error)
    }
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