

let controllerType = "key" // when browser is opened it is not automatic in VR

export function getControllerType(){
    return controllerType
}

export function setControllerType(_type){
    controllerType = _type // vr // controller
    return controllerType
}