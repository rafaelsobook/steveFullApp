import { createGrid, createRect, createTxt } from "./guitool.js"

const {MeshBuilder, GUI, Vector3} = BABYLON
const log = console.log

let optionScreenMesh // a big screen infront of
export function createOptScreen(scene,_meshParent, _pos){
    optionScreenMesh = MeshBuilder.CreatePlane("optionScreenMesh", {width:1, height:1}, scene)
    const texture = GUI.AdvancedDynamicTexture.CreateForMesh(optionScreenMesh)

    const grid = createGrid(false, [.1,.9], false)
    grid.addControl(createTxt("Screen", "40px"),0,0)

    const rect = createRect(grid, 2.9,3,texture, 3)
    texture.addControl(rect)
    log(texture)
    log(_meshParent)
    
    // if(_meshParent) optionScreenMesh.parent = _meshParent
    if(_pos) optionScreenMesh.position = new Vector3(_pos.x,_pos.y, _pos.z)
    return optionScreenMesh
}