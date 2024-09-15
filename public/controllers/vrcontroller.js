import { displayTxt } from "../createDisplay.js"
import { setMeshesVisibility } from "../creations.js"
import { getCharacter } from "../index.js"
import { emitMove, emitStop } from "../socket/socketLogic.js"
const { Vector3, WebXRFeatureName, WebXRHandJoint} = BABYLON
const log = console.log

export function initVrStickControls(scene, xr){
    let cam = xr.baseExperience.camera
    let myChar = getCharacter()

    const {text1, nameMesh} = displayTxt(cam, scene)

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
                        controllerType: 'key'
                    }) 
                })          
                
            }
        })
    })

    try {
        const handFeature = xr.baseExperience.featuresManager.enableFeature(WebXRFeatureName.HAND_TRACKING, "latest", {
            xrInput: xr.input
        })
        let rendererForHand
        handFeature.onHandAddedObservable.add( hand => {
            myChar = getCharacter()   
            cam = xr.baseExperience.camera;
            const myPos = myChar.mainBody.position
            const side = hand.xrController.inputSource.handedness
            cam.position.x = myPos.x
            cam.position.y = myChar.mainBody.position.y+.5
            cam.position.z = myPos.z
            if(side === "left"){
                const indxTip = hand.getJointMesh(WebXRHandJoint.INDEX_FINGER_TIP)
                const middleTip = hand.getJointMesh(WebXRHandJoint.MIDDLE_FINGER_TIP)
                scene.onBeforeRenderObservable.remove(rendererForHand)
                rendererForHand = scene.onBeforeRenderObservable.add(() => {
                    if(isUsingController) return
                    const camPos = cam.getFrontPosition(2)
                    nameMesh.position = camPos
                    const indxAndMiddleDistance = Vector3.Distance(indxTip.position, middleTip.position)
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
                        controllerType: 'key'
                    }) 
                    cam.position.x = cPos.x
                    cam.position.y = cPos.y+.5
                    cam.position.z = cPos.z
                    text1.text = `cPos ${cPos.x}, tPos: ${tPos.x}`
                })
            }
        })
    } catch (error) {
        log(error)
    }
}