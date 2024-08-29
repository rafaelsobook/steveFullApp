import { getCanPress, getCharacter } from "../index.js";
import { emitMove, emitStop } from "../socket/socketLogic.js";
const GUI = BABYLON.GUI
const log = console.log




function _makeThumbArea(name, thickness, color, background) {
    let rect = new GUI.Ellipse();
    rect.name = name;
    rect.thickness = thickness;
    rect.color = color;
    rect.background = background;
    rect.paddingLeft = "0px";
    rect.paddingRight = "0px";
    rect.paddingTop = "0px";
    rect.paddingBottom = "0px";
    return rect;
}
export function initJoyStick(socket, cam, scene, isSocketAvail) {

    let xAddPos = 0;
    let yAddPos = 0;
    let myChar
    let camDir
    let cPos
    let tPos

    let adt = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    let sideJoystickOffset = 50;
    let bottomJoystickOffset = -50;


    const leftThumbContainer = _makeThumbArea("leftThumb", 2, "gray", null);
    leftThumbContainer.height = "120px";
    leftThumbContainer.width = "120px";
    leftThumbContainer.isPointerBlocker = true;
    leftThumbContainer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    leftThumbContainer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    leftThumbContainer.alpha = 0.3;

    leftThumbContainer.left = sideJoystickOffset;
    leftThumbContainer.top = bottomJoystickOffset;

    const leftPuck = _makeThumbArea("leftPuck", 0, "blue", "black");
    leftPuck.height = "65px";
    leftPuck.width = "65px";
    leftPuck.isVisible = true
    leftPuck.left = 0
    leftPuck.isDown = false
    // leftPuck.isPointerBlocker = true;
    leftPuck.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    leftPuck.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;

    leftThumbContainer.onPointerDownObservable.add(function (coordinates) {

        if (!getCanPress()) return log("your canPress is false")
        myChar = getCharacter()
        if (!myChar) return log("character not found")

        leftPuck.isVisible = true;
        leftPuck.floatLeft = coordinates.x - (leftThumbContainer._currentMeasure.width * .5) - sideJoystickOffset;
        leftPuck.left = leftPuck.floatLeft;
        leftPuck.floatTop = adt._canvas.height - coordinates.y - (leftThumbContainer._currentMeasure.height * .5) + bottomJoystickOffset;
        leftPuck.top = leftPuck.floatTop * -1;
        leftPuck.isDown = true;
        leftThumbContainer.alpha = 0.1;
        leftPuck.alpha = 1

        camDir = cam.getForwardRay().direction
    });
    leftThumbContainer.onPointerMoveObservable.add(function (coordinates) {
        if (!getCanPress()) return
        if (leftPuck.isDown) {
            xAddPos = coordinates.x - (leftThumbContainer._currentMeasure.width * .5) - sideJoystickOffset;
            yAddPos = adt._canvas.height - coordinates.y - (leftThumbContainer._currentMeasure.height * .5) + bottomJoystickOffset;
            leftPuck.floatLeft = xAddPos;
            leftPuck.floatTop = yAddPos * -1;
            leftPuck.left = leftPuck.floatLeft;
            leftPuck.top = leftPuck.floatTop;

            // log(xAddPos," ",  yAddPos)
            camDir = cam.getForwardRay().direction
            cPos = myChar.mainBody.position
            tPos = { x: cPos.x + camDir.x * 100, y: cPos.y, z: cPos.z + camDir.z * 100 }

            if(xAddPos > 0) xAddPos = xAddPos / 60
            if(xAddPos < 0) xAddPos = xAddPos / 60

            if(yAddPos > 0) yAddPos = yAddPos / 60
            if(yAddPos < 0) yAddPos = yAddPos / 60
            log(`x: ${xAddPos}, y: ${yAddPos}`)
            emitMove({
                _id: myChar._id,
                movement: { moveX: xAddPos, moveZ: yAddPos },
                direction: tPos,
                controllerType: 'key'
            })
        }
    })
    leftThumbContainer.onPointerUpObservable.add(function (coordinates) {
        leftPuck.isDown = false;

        // make it small
        sideJoystickOffset = 50
        bottomJoystickOffset = -50
        leftThumbContainer.height = "120px";
        leftThumbContainer.width = "120px";
        leftThumbContainer.left = sideJoystickOffset;
        leftThumbContainer.top = bottomJoystickOffset;

        // const pos = scene.getMeshByName(`box.${myId}`).position
        // cam.setTarget(new Vector3(pos.x,pos.y,pos.z))

        xAddPos = 0;
        yAddPos = 0;
        leftPuck.isVisible = false;
        leftThumbContainer.alpha = 0.2;

        leftPuck.floatLeft = xAddPos;
        leftPuck.floatTop = yAddPos * -1;
        leftPuck.left = leftPuck.floatLeft;
        leftPuck.top = leftPuck.floatTop;

        camDir = cam.getForwardRay().direction
        const cPos = myChar.mainBody.position
        log(`x: ${camDir.x}, z: ${camDir.z}`)
        const tPos = { x: cPos.x + camDir.x, y: cPos.y, z: cPos.z + camDir.z }

        emitStop({
            _id: myChar._id,
            movementName: "forward",
            movement: { moveX: Math.sign(xAddPos), moveZ: Math.sign(yAddPos) },
            loc: { x: cPos.x, y: cPos.y, z: cPos.z },
            direction: tPos
        })
        // const toEmit = {
        //     _id: userId,
        //     dirTarg: {x: bodyx, z:bodyz},
        //     mypos: curPos
        // }

        // if(isSocketAvail) socket.emit("stop", toEmit)

    });

    adt.addControl(leftThumbContainer);
    leftThumbContainer.addControl(leftPuck);
    // leftThumbContainer.addControl(leftPuckCont);

    leftThumbContainer.isVisible = true

    return
}