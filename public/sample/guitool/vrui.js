import { randomNumToStr, setMeshesVisibility } from "../creations.js"
import { getThingsInScene } from "../scenes/createScene.js"
import { getMyDetail, getSocket } from "../socket/socketLogic.js"
import { create3DGuiManager, createThreeDBtn, createThreeDPanel, openCloseControls } from "./gui3dtool.js"
import { createGrid, createRect, createTxt } from "./guitool.js"

const {MeshBuilder, GUI, Vector3} = BABYLON
const log = console.log

let menuScreen // a big screen infront of camera or mesh
let menuScreenVersion = undefined // 1, 2, 3 etc

const myItemList = [
    {
        id: randomNumToStr(),
        modelName: "sword"
    },
    {
        id: randomNumToStr(),
        modelName: "gun"
    },
]

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
    
    const leftPanel = createThreeDPanel(manager, 0.01, "normal", {x:0,y:0,z:0}, false, true)
    leftPanel.isVertical = false
    const rightPanel = createThreeDPanel(manager, 0.02, "normal", {x:0,y:-.06,z:0}, false)
    rightPanel.isVertical = false

    mainPanel.addControl(leftPanel)
    mainPanel.addControl(rightPanel)
    rightPanel.updateLayout()
    
    // creating buttons for menu icons category
    const itemsBtn = createThreeDBtn(leftPanel, "ITEMS", 49, .06)
    const settingsBtn = createThreeDBtn(leftPanel, "SETTINGS", 49, .06)

    // for(var i = 0;i<myItemList.length;i++){
    //     const {modelName, id} = myItemList[i]
    //     const holographBtn = createThreeDBtn(rightPanel, modelName, 46, .05, `./images/${modelName}.png`)
    //     holographBtn.id = id
    //     itemsBtns.push(holographBtn)
    //     rightPanel.updateLayout()
    //     holographBtn.onPointerUpObservable.add( () => {
            
    //         const myDetail = getMyDetail()
    //         const itemOnScene = getThingsInScene().find(itm =>itm._id === holographBtn.id)
    //         if(itemOnScene) {
    //             log(itemOnScene)
    //             socket.emit("toggle-visibility", 
    //             {
    //                 entityId: holographBtn.id,
    //                 roomNum: myDetail.roomNum,
    //                 modelName
    //             })
    //             return log("item already on scene do not create")
    //         }
    //         socket.emit("create-something",{
    //             roomNum: myDetail.roomNum, 
    //             entityType: "equipment", 
    //             entityUrl: `./models/${modelName}.glb`, 
    //             entityId: holographBtn.id, 
    //             parentMeshId: myDetail._id,
    //             modelName
    //         })
    //     })
    // }
    const myDetail = getMyDetail()
    myDetail.equipment.forEach(equipment => {
        const {id, name, type, model_url, offset} = equipment
        const holographBtn = createThreeDBtn(rightPanel, name, 46, .05, `./images/${name}.png`)
        holographBtn.id = id
        itemsBtns.push(holographBtn)
        rightPanel.updateLayout()
        holographBtn.onPointerUpObservable.add( () => {
            
            const itemOnScene = getThingsInScene().find(itm =>itm._id === id)
            if(itemOnScene) {
                socket.emit("toggle-visibility", 
                {
                    entityId: id,
                    roomNum: myDetail.roomNum,
                    modelName: name
                })
                return log("item already on scene do not create")
            }
            socket.emit("create-something",{
                roomNum: myDetail.roomNum, 
                entityType: type, 
                entityUrl: model_url, 
                entityId: id, 
                parentMeshId: myDetail._id,
                modelName: name,
                materialInfo: equipment.materialInfo
            })
        })
    })

    const soundBtn = createThreeDBtn(rightPanel, "Sound", 46, .05)
    const arvrBtn = createThreeDBtn(rightPanel, "AR/VR", 46, .05)
    settingsBtns.push(soundBtn)
    settingsBtns.push(arvrBtn)
    rightPanel.updateLayout()

    settingsBtns.forEach(btn => rightPanel.removeControl(btn))

    itemsBtn.onPointerUpObservable.add(function(){
        settingsBtns.forEach(btn => rightPanel.removeControl(btn))
        itemsBtns.forEach(btn => rightPanel.addControl(btn))
        rightPanel.updateLayout()
        // openCloseControls(itemsBtns, true)
        // openCloseControls(settingsBtns, false, () => {
        //     settingsBtns.forEach(btn => rightPanel.removeControl(btn))
        //     itemsBtns.forEach(btn => rightPanel.addControl(btn))
        // })
        // rightPanel.updateLayout()
        // log(rightPanel.children.length)
    });  

    settingsBtn.onPointerUpObservable.add(function(){
        itemsBtns.forEach(btn => rightPanel.removeControl(btn))
        settingsBtns.forEach(btn => rightPanel.addControl(btn))
        
        rightPanel.updateLayout()
        // openCloseControls(itemsBtns, false)
        // openCloseControls(settingsBtns, true, () => {
        //     itemsBtns.forEach(btn => rightPanel.removeControl(btn))
        //     settingsBtns.forEach(btn => rightPanel.addControl(btn))
        // })
        // rightPanel.updateLayout()
        // log(rightPanel.children.length)
    });  



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