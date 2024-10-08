import { displayTxt } from "../createDisplay.js"
import { setMeshesVisibility } from "../creations.js"
import { getCharacter } from "../index.js"
import { emitMove, emitStop, getSocket } from "../socket/socketLogic.js"
const { Vector3, WebXRFeatureName, WebXRHandJoint} = BABYLON
const log = console.log

export function initVrStickControls(scene, xr){
    let cam = xr.baseExperience.camera
    let myChar = getCharacter()

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
            cam.position.y = myChar.mainBody.position.y+.5
            cam.position.z = myPos.z
            if(mc.handedness === "left"){
                let thumbstickComponent = mc.getComponent(mc.getComponentIds()[2]);
                log(thumbstickComponent)
                if(!thumbstickComponent) return log("thumbstickComponent not found")
                log("thumbstickComponent is FOUND !")
                thumbstickComponent.onButtonStateChangedObservable.add(() => { 
                    // const absoluteFrontPos = cam.getFrontPosition(2)
                    // myChar = getCharacter()
                    // if(!myChar) return
                    // nameMesh.position = absoluteFrontPos;
                    // // text1.text = `x:${thumbstickComponent.axes.x}, y: ${thumbstickComponent.axes.y}`
                    // let forwardDirection = new Vector3(0, 0, 1); // Forward in local space
                    // let frontPos = Vector3.TransformNormal(forwardDirection, cam.getWorldMatrix());
                    // const cPos = myChar.mainBody.position
                    // const tPos = {x:cPos.x + frontPos.x , y: 1, z:cPos.z + frontPos.z}

                    // text1.text = `_id: ${myChar._id}`
                    // cam.position.x = cPos.x
                    // cam.position.y = myChar.mainBody.position.y+.25
                    // cam.position.z = cPos.z
                    // emitStop({
                    //     _id: myChar._id,
                    //     movement: { moveX: 0, moveZ: 0 },
                    //     direction: tPos,
                    //     controllerType: 'key'
                    // })
                })
                
                thumbstickComponent.onAxisValueChangedObservable.add((axes) => {
                    
                    // const axes = thumbstickComponent.axes
                    
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
                    cam.position.y = myChar.mainBody.position.y+.5
                    cam.position.z = cPos.z
                    if(axes.x === 0 && axes.y === 0){
                        if(isTriggeredStop) return 
                        emitStop({
                            _id: myChar._id,
                            movement: { moveX: 0, moveZ: 0 },
                            loc: {x: cPos.x, y: cPos.y, z: cPos.z},
                            direction: tPos,
                            controllerType: 'key'
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
                        controllerType: 'key',
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
        handFeature.onHandAddedObservable.add( hand => {
            myChar = getCharacter()   
           
            const myPos = myChar.mainBody.position
            const side = hand.xrController.inputSource.handedness
            cam.position.x = myPos.x
            cam.position.y = myChar.mainBody.position.y+.5
            cam.position.z = myPos.z
            
            nameMesh.position = cam.getFrontPosition(2) 

            if(side === "right" && r_wrist === undefined) {
                myChar.rHandMesh.isVisible = true
                r_wrist = hand.getJointMesh(WebXRHandJoint.WRIST)
            }
            if(side === "left" && l_wrist === undefined) {   
                myChar.lHandMesh.isVisible = true                 
                l_indxTip = hand.getJointMesh(WebXRHandJoint.INDEX_FINGER_TIP)
                l_middleTip = hand.getJointMesh(WebXRHandJoint.MIDDLE_FINGER_TIP)
                l_wrist = hand.getJointMesh(WebXRHandJoint.WRIST)
            } 
            log("not yet ready ", l_wrist, r_wrist)
            if(!l_wrist || !r_wrist) return log("not yet ready")
            log("ready ", l_wrist, r_wrist)

            // if(side === "right"){
            //     r_wrist = hand.getJointMesh(WebXRHandJoint.WRIST)

            //     scene.onBeforeRenderObservable.remove(rendererForHand)
            //     rendererForHand = scene.onBeforeRenderObservable.add(() => {
                    
            //         // if(isUsingController) return
            //         const camPos = cam.getFrontPosition(2)
            //         nameMesh.position = camPos
            
            //         text1.text = `working before render wrist vr`
                    
    
            //         // const lWristPos = l_wrist.position
            //         // const rWristPos = r_wrist.position
            //         if(l_wrist) myChar.leftHandControl.position = l_wrist.position
            //         if(r_wrist) myChar.rightHandControl.position = r_wrist.position
        
            //         text1.text = `lwristPosX: ${l_wrist.position.x} rWristPos: ${r_wrist.position.x}`
            
            //         return 
                
            //         let indxAndMiddleDistance = Vector3.Distance(l_indxTip.position, l_middleTip.position)
            //         text1.text = `distance ${indxAndMiddleDistance}`
            //         let forwardDirection = new Vector3(0, 0, 100); // Forward in local space
            //         let frontPos = Vector3.TransformNormal(forwardDirection, cam.getWorldMatrix());
            //         const cPos = myChar.mainBody.position
            //         const tPos = {x:cPos.x + frontPos.x , y: 1, z:cPos.z + frontPos.z}
            //         if(indxAndMiddleDistance > 0.02) {                    
            //             if(isTriggeredStop) return
            //             emitStop({
            //                 _id: myChar._id,
            //                 movement: { moveX: 0, moveZ: 0 },
            //                 loc: {x: cPos.x, y: cPos.y, z: cPos.z},
            //                 direction: tPos,
            //                 controllerType: 'key'
            //             })
            //             return isTriggeredStop = true                        
            //         }
                    
    
                    
            //         isTriggeredStop = false
                
            //         emitMove({
            //             _id: myChar._id,
            //             movement: { moveX: 0, moveZ: 1 },
            //             direction: tPos,
            //             wristPos: { 
            //                 left: { x: lWristPos.x, y:lWristPos.y, z: lWristPos.z }, 
            //                 right: { x: rWristPos.x, y:rWristPos.y, z: rWristPos.z } 
            //             },
            //             controllerType: 'key'
            //         }) 
            //         cam.position.x = cPos.x
            //         cam.position.y = cPos.y+.5
            //         cam.position.z = cPos.z
            //         text1.text = `cPos ${cPos.x}, tPos: ${tPos.x}`
            //     })
            // }
      
            // scene.onPointerObservable.add((evt) => {
            //     //this code below runs 60fps
            //     const pointerId = evt.event.pointerId;
            //     let pickInfo = evt.pickInfo
            //     if(!pickInfo) return text1.text = `not sensing anything`
            //     // logXRUI(xrCam, nameMesh, text1, `pointerId ${pointerId}`)
            //     if(pickInfo){
            //         const pickedMeshName = pickInfo.pickedMesh?.name
            //         if(!pickedMeshName) return text1.text = `not sensing anything`
            //         text1.text = `picked ${pickedMeshName}`
                    
                    
            //         if(!rHand) return  text1.text = `rHand not found`
            //         text1.text = `not found rhand`
            //         // const handCenter = rHand.getJointMesh(WebXRHandJoint.WRIST)
            //         // if(handCenter) {                    
            //         //     fire_ps.emitter = pickInfo.pickedPoint
            //         // }
                    
            //         // if(!webxrHandObject) return logXRUI(xrCam, nameMesh, text1, `webxrHandObject not found`)
    
            //         // logXRUI(xrCam, nameMesh, text1, `Hand Pos ${webxrHandObject.position.x}`)
            //         // box.position.y ++
            //     }else{
            //         // if(!rHand) return logXRUI(xrCam, nameMesh, text1, `rHand not found`)
            //         // const handCenter = rHand.getJointMesh(WebXRHandJoint.MIDDLE_FINGER_METACARPAL)
            //         // fire_ps.emitter = handCenter
            //     }
               
            //     // const xrController = xrHelper.pointerSelection.getXRControllerByPointerId(pointerId);
            //     // const webxrHandObject = xrHandFeature.getHandByControllerId(xrController.uniqueId);
        
            //     // if(xrController) logXRUI(xrCam, nameMesh, text1, `MotionController Pos ${xrController.position.x}`)
            //     // if(webxrHandObject) logXRUI(xrCam, nameMesh, text1, `Hand Pos ${webxrHandObject.position.x}`)
                
            // });
        })

        const socket = getSocket()
        scene.onBeforeRenderObservable.remove(rendererForHand)
        rendererForHand = scene.onBeforeRenderObservable.add(() => {
            
            if(isUsingController) return
            if(!l_wrist || !r_wrist) return 

            const camFrontWorldPos = cam.getFrontPosition(2)
            nameMesh.position = camFrontWorldPos
            
            const lWristPos = l_wrist.position
            const rWristPos = r_wrist.position

            const lWristQuat = l_wrist.rotationQuaternion;
            const rWristQuat = r_wrist.rotationQuaternion;

            myChar.lHand.position = lWristPos
            myChar.rHand.position = rWristPos

            myChar.lHand.rotationQuaternion = lWristQuat
            myChar.rHand.rotationQuaternion = rWristQuat


            if(l_wrist && r_wrist){
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
                    controllerType: 'key'
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
                controllerType: 'key'
            }) 
            cam.position.x = cPos.x
            cam.position.y = cPos.y+.5
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