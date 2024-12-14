import { toggleAudio } from "../controllers/audioController.js"
import { randomNumToStr, setMeshesVisibility } from "../creations.js"
import {  getSocket } from "../socket/socketLogic.js"
import { create3DGuiManager, createThreeDBtn, createThreeDPanel, openCloseControls } from "./gui3dtool.js"
import { createGrid, createRect, createTxt } from "./guitool.js"
import { createInventoryUIForVR } from "../inventory.js"

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

    const socket = getSocket()

    const manager = create3DGuiManager(scene)
    const mainPanel = createThreeDPanel(manager, 0.01, "normal", {x:0,y:0,z:0}
    )
    menuScreen = mainPanel
    menuScreenVersion = 2
    mainPanel.isVertical = true
    
    const topPanel = createThreeDPanel(manager, 0.01, "normal", {x:0,y:0,z:0}, false, true)
    topPanel.isVertical = false
    const bottomPanel = createThreeDPanel(manager, 0.02, "normal", {x:0,y:-.06,z:0}, false)
    bottomPanel.isVertical = false

    mainPanel.addControl(topPanel)
    mainPanel.addControl(bottomPanel)
    bottomPanel.updateLayout()
    
    // creating buttons for menu icons category
    const itemsBtn = createThreeDBtn(topPanel, "ITEMS", 49, .06)
    const settingsBtn = createThreeDBtn(topPanel, "SETTINGS", 49, .06)  

    const audioBtn = createThreeDBtn(bottomPanel, "Audio", 46, .05)
    const arvrBtn = createThreeDBtn(bottomPanel, "AR/VR", 46, .05)
    settingsBtns.push(audioBtn)
    settingsBtns.push(arvrBtn)

    itemsBtns = createInventoryUIForVR(bottomPanel)

    itemsBtn.onPointerUpObservable.add(function(){
        openItems()
        // settingsBtns.forEach(btn => bottomPanel.removeControl(btn))
        // itemsBtns.forEach(btn => bottomPanel.addControl(btn))
        // bottomPanel.updateLayout()
        // openCloseControls(itemsBtns, true)
        // openCloseControls(settingsBtns, false, () => {
        //     settingsBtns.forEach(btn => bottomPanel.removeControl(btn))
        //     itemsBtns.forEach(btn => bottomPanel.addControl(btn))
        // })
        // bottomPanel.updateLayout()
        // log(bottomPanel.children.length)
    });
    settingsBtn.onPointerUpObservable.add(function(){
        openSettings()
        // itemsBtns.forEach(btn => bottomPanel.removeControl(btn))
        // settingsBtns.forEach(btn => bottomPanel.addControl(btn))
        
        // bottomPanel.updateLayout()
        // openCloseControls(itemsBtns, false)
        // openCloseControls(settingsBtns, true, () => {
        //     itemsBtns.forEach(btn => bottomPanel.removeControl(btn))
        //     settingsBtns.forEach(btn => bottomPanel.addControl(btn))
        // })
        // bottomPanel.updateLayout()
        // log(bottomPanel.children.length)
    });  
    audioBtn.onPointerUpObservable.add(function(){
        toggleAudio(scene.activeCamera)
    })
    function openItems(){
        settingsBtns.forEach(btn => bottomPanel.removeControl(btn))
        itemsBtns.forEach(btn => bottomPanel.addControl(btn))
        bottomPanel.updateLayout()
    }
    function openSettings(){
        itemsBtns.forEach(btn => bottomPanel.removeControl(btn))
        settingsBtns.forEach(btn => bottomPanel.addControl(btn))
        bottomPanel.updateLayout()
    }
    // start the menu with item on the list
    // settingsBtns.forEach(btn => {
    //     bottomPanel.removeControl(btn)
        
    //     btn.isVisible = false
    //     btn.mesh.isVisible = false
    //     log(btn)
    //     bottomPanel.updateLayout()
    // })
    // itemsBtn.forEach(btn => {
    //     bottomPanel.removeControl(btn)
        
    //     btn.isVisible = false
    //     btn.mesh.isVisible = false
    // })
    bottomPanel.updateLayout()
    return {mainPanel, openItems, openSettings}
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