import { emitVideoJoin, emitVideoStop } from "../socket/socketLogic.js";
const GUI = BABYLON.GUI;
const log = console.log;

export function initCameraControl(socket, cam) {
    let isActive = false;
    let camDir;

    let adt = GUI.AdvancedDynamicTexture.CreateFullscreenUI("CameraUI");
    
    // Create a simple rectangular button
    const cameraButton = new GUI.Rectangle("cameraButton");
    cameraButton.width = "60px";
    cameraButton.height = "60px";
    cameraButton.thickness = 2;
    cameraButton.background = "red";
    cameraButton.color = "white";
    cameraButton.cornerRadius = 5;
    cameraButton.isPointerBlocker = true;
    cameraButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    cameraButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    cameraButton.right = "50px";
    cameraButton.top = "-50px";

    cameraButton.onPointerDownObservable.add(function () {
        isActive = !isActive;
        cameraButton.background = isActive ? "green" : "red";
        
        camDir = cam.getForwardRay().direction;

        if (isActive) {
            emitVideoJoin({
                cameraDirection: camDir
            });
        } else {
            emitVideoStop({
                cameraDirection: camDir
            });
        }
    });

    adt.addControl(cameraButton);

    return;
}