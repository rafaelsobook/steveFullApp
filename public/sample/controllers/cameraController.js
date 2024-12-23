import { emitVideoJoin, emitVideoStop } from "../socket/socketLogic.js";
const GUI = BABYLON.GUI;
const log = console.log;

export function initCameraControl(socket, cam) {
    let isActive = false;
    let camDir;

    let adt = GUI.AdvancedDynamicTexture.CreateFullscreenUI("CameraUI");
    



    const cameraButton = new GUI.Rectangle("cameraButton");
    // cameraButton.addControl(buttonImage);
    cameraButton.width = "60px";
    cameraButton.height = "60px";
    cameraButton.thickness = 0;
    cameraButton.cornerRadius = 5;
    cameraButton.isPointerBlocker = true;
    cameraButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    cameraButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    cameraButton.right = "50px";
    cameraButton.top = "-50px";
    cameraButton.background = "yellow";
    cameraButton.onPointerDownObservable.add(function () {
        isActive = !isActive;
        
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