import { changeGizmo, getGizmo } from "./gizmos.js";
import { createGuiImg, createTxt } from "./guitool.js";
import { setMenuScreen } from "./vrui.js";

const { GUI, Vector3 } =BABYLON
const log = console.log

let manager; // GUI3DManager

// when a mesh is clicked and gizmo is opened it will attach buttons for rotation and position
let switchToPositionBtn
let switchToRotationBtn
let meshDisplayPanel
export function getGui3DManager(){
    return manager
}
export function getSwitchBtns(){
    return { switchToPositionBtn,switchToRotationBtn,meshDisplayPanel }
}
export function create3DGuiManager(scene){
    if(manager) {
        log('GUI3Dmanager already created')
        return manager
    }else log("Creating GUIManager")
    manager = new GUI.GUI3DManager(scene)

    meshDisplayPanel = createThreeDPanel(manager, 0.1, "normal", {x:0,y:0,z: 0})
    switchToPositionBtn = createThreeDBtn(meshDisplayPanel, "Move", 50, .3)
    switchToRotationBtn = createThreeDBtn(meshDisplayPanel, "Rotate", 50, .3)
    openClosePanel(meshDisplayPanel, false)
    
    switchToPositionBtn.onPointerUpObservable.add(() => {
        changeGizmo(true)
        log("switching")
    })
    switchToRotationBtn.onPointerUpObservable.add(() => {
        changeGizmo(false, true)
        log("switching")
    })
    

    return manager
}


export function createThreeDPanel(_GUIManager, margin, panelType, panelPos, isMenuPanel, isVertical){
    let panel
    switch(panelType){
        case "sphere":
            const anchor = new BABYLON.TransformNode("");
            panel = new GUI.SpherePanel();
            panel.linkToTransformNode(anchor)
        break
        case "cylinder":
            panel = new GUI.CylinderPanel()
            // panel.radius = 1;
        break
        default:
            panel = new GUI.StackPanel3D();
            panel.isVertical = isVertical
        break
    }
    panel.margin = margin ? margin : 0.02;
    // panel.columns = 2
    // panel.rows = 2
    if(_GUIManager) _GUIManager.addControl(panel);
    if(panelPos){
        const {x,y,z} = panelPos
        panel.position = new Vector3(x, y, z)
    }
 
    if(isMenuPanel) setMenuScreen(panel)
    return panel
}

export function createThreeDBtn(panel, label, fontSize, _scaleXYZ, _imgUrl, isNotVisible){
    // const button = new GUI.Button3D("orientation");
    // const button = new BABYLON.GUI.HolographicButton("down");
    const button = new GUI.TouchHolographicButton("reset")
    button.scaling = new Vector3(_scaleXYZ ? _scaleXYZ : .5,_scaleXYZ ? _scaleXYZ : .5, _scaleXYZ ? _scaleXYZ : .5)
    
    if(panel) panel.addControl(button)
    // button.scaling.addInPlace(new Vector3(0,1,1))
    // log(button.mesh.material)
    // const mat= new BABYLON.StandardMaterial("asd")
    // mat.emissiveColor = new BABYLON.Color3(2,.1,.3)
    // button.mesh.material = mat
    
    
    // button.onPointerUpObservable.add(() => {
    //     button.mesh.dispose()
    // })
    if(label)button.text = label
    if(_imgUrl)button.imageUrl = _imgUrl
    if(isNotVisible) button.isVisible = false

    // button.content has problems if I am using panel.removeControl(button)
    // if(_imgUrl) {
    //     if(label){
    //         button.text = label
    //         button.imageUrl = _imgUrl
    //     }else button.content = createGuiImg("asd", _imgUrl)       
    // }else{
    //     button.text = label
    //     button.text.color = "red" 
    // }
    
    return button
}

export function createSlate(title, _GUIManager, content, pos, _dimensions){
    const defDimension = _dimensions ? _dimensions : 2
    const slate = new GUI.HolographicSlate("down");
    slate.minDimensions = new BABYLON.Vector2(defDimension, defDimension);
    slate.dimensions = new BABYLON.Vector2(defDimension, defDimension);
    slate.titleBarHeight = 0.02;
    slate.title = title;
    if(_GUIManager) _GUIManager.addControl(slate);
    if(content) slate.content = content
    // slate.content = new BABYLON.GUI.Image("cat","https://placekitten.com/300/300");
    if(pos) slate.position = new Vector3(pos.x,pos.y, pos.z);
}
export function createNearMenu(_GUIManager, _columns, _rows){
    const near = new GUI.NearMenu("near");
    _GUIManager.addControl(near)

    near.columns = _columns ? _columns : 2
    near.rows = _rows ? _rows : 1
    return near
}

export function openClosePanel(_panelToOpenOrClose, _isOpen, _doNotIncludeChild){
    _panelToOpenOrClose.isVisible = _isOpen
    if(!_doNotIncludeChild){
        _panelToOpenOrClose.children.forEach(chld => chld.isVisible = _isOpen)
    }
}
export function openCloseControls(_arrayOfControls, _isOpen, cb){
    if(!_arrayOfControls || !_arrayOfControls.length) return log("no controls to open or close")
    _arrayOfControls.forEach(chld => chld.isVisible = _isOpen)
    if(cb) cb(_isOpen)
}