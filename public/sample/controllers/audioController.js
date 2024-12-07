import { emitAudioJoin, emitAudioStop } from "../socket/socketLogic.js";
const GUI = BABYLON.GUI;
const log = console.log;

let buttonImage;
let cameraButton;
let isActive = false;
let camDir;
export function initAudioControl(socket, cam) {


    let adt = GUI.AdvancedDynamicTexture.CreateFullscreenUI("CameraUI");
    // Create a simple rectangular button
    buttonImage = new GUI.Image("micButton", "images/mic-inactive.png");
    buttonImage.stretch = GUI.Image.STRETCH_UNIFORM;
    buttonImage.width = "40px";  // Adjust size as needed
    buttonImage.height = "40px"; // Adjust size as needed

    // Create a simple rectangular button
    cameraButton = new GUI.Rectangle("cameraButton");
    cameraButton.addControl(buttonImage);
    cameraButton.width = "60px";
    cameraButton.height = "60px";
    cameraButton.thickness = 2;
    // cameraButton.background = "red";
    cameraButton.color = "black";
    cameraButton.cornerRadius = 5;
    cameraButton.isPointerBlocker = true;
    cameraButton.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    cameraButton.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    cameraButton.left = "-50px";
    cameraButton.top = "-50px";

    cameraButton.onPointerDownObservable.add(function () {
        toggleAudio(cam);
    });

    adt.addControl(cameraButton);

    return;
}

export function toggleAudio(cam){
    if(!buttonImage && !cameraButton) return log("no button image or camera button")
    isActive = !isActive;
    buttonImage.source = isActive ? "images/mic-active.png" : "images/mic-inactive.png";
    cameraButton.color = isActive ? "green" : "black";
    camDir = cam.getForwardRay().direction;

    if (isActive) {
        emitAudioJoin("audio", {
            cameraDirection: camDir
        })
    } else {
        emitAudioStop("audio", {
            cameraDirection: camDir
        });
    }
}