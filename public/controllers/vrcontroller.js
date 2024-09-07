import { displayTxt } from "../createDisplay.js"
import { setMeshesVisibility } from "../creations.js"
import { getCharacter } from "../index.js"
import { emitMove, emitStop } from "../socket/socketLogic.js"
const { Vector3} = BABYLON
const log = console.log

export function initVrStickControls(scene, xr){
    let cam = xr.baseExperience.camera
    let myChar = getCharacter()

    xr.input.onControllerAddedObservable.add(controller => {
        controller.onMotionControllerInitObservable.add(mc => {
            myChar = getCharacter()   
            cam = xr.baseExperience.camera;

            const {text1, nameMesh} = displayTxt(cam, scene)
            nameMesh.position = cam.position;
            nameMesh.position.z += 1
            if(!myChar) return log("not found character")
            setMeshesVisibility(myChar.root.getChildren()[0].getChildren(), false)
            cam.position.x = 0
            cam.position.y = myChar.mainBody.position.y+.5
            cam.position.z = 0
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
                let isTriggeredStop = false
                thumbstickComponent.onAxisValueChangedObservable.add((axes) => {
                    
                    // const axes = thumbstickComponent.axes
                    
                    myChar = getCharacter()
                    if(!myChar) return
                    // const frontPos = cam.getFrontPosition(2)
                    
                    // The forward direction can be calculated by transforming a forward vector
                    let forwardDirection = new Vector3(0, 0, 1); // Forward in local space
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
                        return isTriggeredStop = true
                    }
                    isTriggeredStop = false
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
}