import { createThreeDBtn } from "./guitool/gui3dtool.js"
import { createButtonImage, createGrid, createRect, createTxt } from "./guitool/guitool.js"
import { getThingsInScene } from "./scenes/createScene.js"
import { getSocket, getMyDetail } from "./socket/socketLogic.js"

export function createInventoryUIForVR(parentPanelForButton){
    const myDetail = getMyDetail()
    const socket = getSocket()
    let itemsBtns = []

    if(!myDetail || !socket) {
        console.log("no myDetail or socket")
        return itemsBtns
    }

    myDetail.equipment.forEach(equipment => {
        const {id, name, type, model_url, offset} = equipment
        const holographBtn = createThreeDBtn(parentPanelForButton, name, 46, .05, `./images/${name}.png`)
        holographBtn.id = id
        itemsBtns.push(holographBtn)
        parentPanelForButton.updateLayout()
        holographBtn.onPointerUpObservable.add( () => {
            
            const itemOnScene = getThingsInScene().find(itm =>itm._id === id)
            if(itemOnScene) {
                socket.emit("toggle-visibility", 
                {
                    entityId: id,
                    roomNum: myDetail.roomNum,
                    modelName: name
                })
                log(`${name} already on scene do not create instead toggle visibility`)
            }else{
                socket.emit("create-something",{
                    roomNum: myDetail.roomNum, 
                    entityType: type, 
                    entityUrl: model_url, 
                    entityId: id, 
                    parentMeshId: myDetail._id,
                    modelName: name,
                    materialInfo: equipment.materialInfo,
                    offset
                })
            }
        })
    })  

    return itemsBtns 
}

export function createInventoryUI2D(ADT){
    const myDetail = getMyDetail()
    const socket = getSocket()

    const rectangleContainer = createRect(false, .55, .5, ADT, 1, "#444444")
    rectangleContainer.isVisible = false
    const grid = createGrid(rectangleContainer, [.1,.2,.8], [1])

    const header = createTxt("Inventory", 20, "white")
    grid.addControl(header, 0, 0)

    const itemGridCont = createGrid(false, false, false)
    grid.addControl(itemGridCont, 1, 0)

    const invBtn = createButtonImage("images/bagpack.png", () => {
        rectangleContainer.isVisible = !rectangleContainer.isVisible
    })
    invBtn.rectangle.left = "-120px"

    myDetail.equipment.forEach((equipment, indx) => {
        const {id, name, type, model_url, offset} = equipment

        const rect = createRect(false, "60px", "60px", itemGridCont, 1)
        rect.thickness = 1
        const itemLabel = createTxt(name, 16, "white")
        rect.addControl(itemLabel)

        rect.onPointerUpObservable.add(() => {
            rectangleContainer.isVisible = !rectangleContainer.isVisible

            const itemOnScene = getThingsInScene().find(itm =>itm._id === id)
            if(itemOnScene) {
                socket.emit("toggle-visibility", 
                {
                    entityId: id,
                    roomNum: myDetail.roomNum,
                    modelName: name
                })
                log(`${name} already on scene do not create instead toggle visibility`)
            }else{
                socket.emit("create-something",{
                    roomNum: myDetail.roomNum, 
                    entityType: type, 
                    entityUrl: model_url, 
                    entityId: id, 
                    parentMeshId: myDetail._id,
                    modelName: name,
                    materialInfo: equipment.materialInfo,
                    offset
                })
            }
        })
        itemGridCont.addColumnDefinition(.1)
        itemGridCont.addControl(rect, 0, indx)
    })

}