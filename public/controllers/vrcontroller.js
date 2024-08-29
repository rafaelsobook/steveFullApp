import { displayTxt } from "../createDisplay.js"
import { getCharacter } from "../index.js"
import { emitMove } from "../socket/socketLogic.js"
const { Vector3} = BABYLON
const log = console.log
export function initVrStickControls(scene, xr){
    const cam = xr.baseExperience.camera
    let myChar = getCharacter()

    xr.input.onControllerAddedObservable.add(controller => {
        controller.onMotionControllerInitObservable.add(mc => {
            myChar = getCharacter()

            cam.position.x = 0
            cam.position.y = 0
            cam.position.z = 0

            const {text1, nameMesh} = displayTxt(cam, scene)
            nameMesh.position = cam.position;
            nameMesh.position.z += 1
            
            if(mc.handedness === "left"){
                let thumbstickComponent = mc.getComponent(mc.getComponentIds()[2]);
                log(thumbstickComponent)
         
                thumbstickComponent.onButtonStateChangedObservable.add(() => { 
                    const frontPos = cam.getFrontPosition(2)
                   
                    nameMesh.position = frontPos;
                    // text1.text = `x:${thumbstickComponent.axes.x}, y: ${thumbstickComponent.axes.y}`
                })
                thumbstickComponent.onAxisValueChangedObservable.add((axes) => {
                    
                    // const axes = thumbstickComponent.axes
                    // if(!myChar) return
                    myChar = getCharacter()
                    const frontPos = cam.getFrontPosition(2)
                    const cPos = myChar.mainBody.position
                    const tPos = {x:cPos.x + frontPos.x , y: 1, z:cPos.z + frontPos.z}
                    nameMesh.position = frontPos;
                    // text1.text = `x:${axes.x}, y: ${axes.y * -1}`
                    myChar = getCharacter()
                    // text1.text = `x:${tPos.x}, y: ${tPos.z }`
                    text1.text = `_id: ${myChar._id}`
                    cam.position.x = cPos.x
                    cam.position.y = 1
                    cam.position.z = cPos.z
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