import { emitAudioJoin, emitAudioStop } from "../socket/socketLogic.js";
import { createButtonImage } from "../guitool/guitool.js";
const GUI = BABYLON.GUI;
const log = console.log;

let buttonImage;
let cameraButton;
let isActive = false;
let camDir;

export function initAudioControl(cam) {
    const btn = createButtonImage("images/mic-inactive.png", () => {
        toggleAudio(cam);
    })
    buttonImage = btn.buttonImage
    cameraButton = btn.rectangle
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