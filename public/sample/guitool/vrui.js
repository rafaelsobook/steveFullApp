import { getMyDetail, getSocket } from "../socket/socketLogic.js"
import { create3DGuiManager, createThreeDBtn, createThreeDPanel, openCloseControls } from "./gui3dtool.js"
import { createGrid, createRect, createTxt } from "./guitool.js"

const {MeshBuilder, GUI, Vector3} = BABYLON
const log = console.log

let menuScreen // a big screen infront of camera or mesh
let menuScreenVersion = undefined // 1, 2, 3 etc

export function getMenuScreen(){
    return menuScreen
}
export function setMenuScreen(_menuScreen){
    menuScreen = _menuScreen
}

export function createMenuVTwo(scene, _meshParent, _pos){
    if(menuScreenVersion === 2 && menuScreen) return log("menuScreen Already created")
    let itemsBtns = []
    let settingsBtns = []

    const manager = create3DGuiManager(scene)
    const mainPanel = createThreeDPanel(manager, 0.01, "normal", {x:0,y:1.5,z:1}
    )
    menuScreen = mainPanel
    menuScreenVersion = 2
    mainPanel.isVertical = true
    
    
    const leftPanel = createThreeDPanel(manager, 0.01, "normal", {x:0,y:0,z:0}, false, true)
    leftPanel.isVertical = false

    const itemsBtn = createThreeDBtn(leftPanel, "ITEMS", 49, .06)
    const settingsBtn = createThreeDBtn(leftPanel, "SETTINGS", 49, .06)
    itemsBtn.onPointerUpObservable.add(function(){
        openCloseControls(itemsBtns, true)
        openCloseControls(settingsBtns, false, () => {
            settingsBtns.forEach(btn => rightPanel.removeControl(btn))
            itemsBtns.forEach(btn => rightPanel.addControl(btn))
        })
        rightPanel.updateLayout()
        log(rightPanel.children.length)
    });  
    settingsBtn.onPointerUpObservable.add(function(){
        openCloseControls(itemsBtns, false)
        openCloseControls(settingsBtns, true, () => {
            itemsBtns.forEach(btn => rightPanel.removeControl(btn))
            settingsBtns.forEach(btn => rightPanel.addControl(btn))
        })
        rightPanel.updateLayout()
        log(rightPanel.children.length)
    });  

    const rightPanel = createThreeDPanel(manager, 0.02, "normal", {x:0,y:-.06,z:0}, false)
    for(var i = 0;i<1;i++){
        const item = createThreeDBtn(rightPanel, "Sword", 46, .05, "./images/sword.png")
        itemsBtns.push(item)
        rightPanel.updateLayout()
        item.onPointerUpObservable.add(() => {
            
            const socket = getSocket()
            const myDetail = getMyDetail()
            socket.emit("create-something",{
                roomNum: myDetail.roomNum, 
                entityType: "equipment", 
                entityUrl: "./models/sword.glb", 
                entityId: "as2394f3", 
                _id: myDetail._id
            })
        })
    }

    const soundBtn = createThreeDBtn(false, "Sound", 46, .05)
    const arvrBtn = createThreeDBtn(false, "AR/VR", 46, .05)
    settingsBtns = [soundBtn,arvrBtn]
    rightPanel.isVertical = false
    

    mainPanel.addControl(leftPanel)
    mainPanel.addControl(rightPanel)
    rightPanel.updateLayout()
    return mainPanel
}


// not a 3d GUI
export function createMenuVOne(scene,_meshParent, _pos){
    menuScreen = MeshBuilder.CreatePlane("optionScreenMesh", {width:1, height:1}, scene)
    const texture = GUI.AdvancedDynamicTexture.CreateForMesh(menuScreen)

    const grid = createGrid(false, [.1,.9], false)
    grid.addControl(createTxt("Screen", "40px"),0,0)

    const rect = createRect(grid, 2.9,3,texture, 3)
    texture.addControl(rect)
    log(texture)
    log(_meshParent)
    
    // if(_meshParent) optionScreenMesh.parent = _meshParent
    if(_pos) menuScreen.position = new Vector3(_pos.x,_pos.y, _pos.z)
    return menuScreen
}