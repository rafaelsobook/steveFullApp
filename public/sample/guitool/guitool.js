const {MeshBuilder, Vector3, GUI} = BABYLON 
const log = console.log;

let G;
let ADT // advancedDynamic Texture FullScreenUI
let GBtn
let GText
let Ggrid
let GRect
let GCheckBx

export function bylonUIInit() {
    G = BABYLON.GUI
    GBtn = G.Button
    GText = G.TextBlock
    Ggrid = G.Grid
    GRect = G.Rectangle
    GCheckBx = G.Checkbox
    // if (!ADT) ADT = G.AdvancedDynamicTexture("ADT_GUI")
}
export function createBtn(btnLabel, _ADTexture, buttonImg, _width, _height, _fontS, _background) {
    let btn
    if (buttonImg) {
        console.log("running")
        btn = GUI.Button.CreateImageButton("button", btnLabel, buttonImg)
    } else btn = GUI.Button.CreateSimpleButton("button", btnLabel)


    let defWidth = .6
    let defBackgroundC = "#27282a";

    btn.width = _widthInNum ? _widthInNum : defWidth
    btn.height = _height ? _height : defWidth / 1.5
    btn.fontSize = _fontS ? _fontS : (defWidth * 90)
    btn.background = _background ? _background : defBackgroundC
    btn.color = "white"

    if (_ADTexture) _ADTexture.addControl(btn)
    return btn
}
export function createRowsOfText(_arrayOfText, _fontS, parentUI) {
    const grid = new Ggrid("grid")
    const textBlocks = []
    let size = 1 / _arrayOfText.length
    _arrayOfText.forEach((txt, indx) => {
        const txtBlock = createTxt(txt, _fontS, "white")
        grid.addRowDefinition(size)
        grid.addControl(txtBlock, indx, 0)
        if (_arrayOfText.length <= 3) grid.addRowDefinition(size)

        textBlocks.push(txt)
    })
    parentUI.addControl(grid)
    return { grid, textBlocks }
}
export function createGrid(parentUI, rowsSizesArray, columnSizesArray) {
    const grid = new Ggrid("grid")

    if (rowsSizesArray) {
        if (!rowsSizesArray.length) return log("rowSizeArray must be an array of sizes ex. [.1,.2,.5]")
        rowsSizesArray.forEach(size => {
            grid.addRowDefinition(size)
        })
    }
    if (columnSizesArray) {
        if (!columnSizesArray.length) return log("columnSizesArray must be an array of sizes ex. [.1,.2,.5]")
        columnSizesArray.forEach(size => {
            grid.addColumnDefinition(size)
        })
    }
    if (parentUI) parentUI.addControl(grid) // could be a rectangle or another grid
    return grid
}
export function createRect(_childUI, _defWidthInNum, _defHeightInNum, _ADTexture, _cornerRadius, _background) {
    const rect = new GRect("rectangle")

    let width = _defWidthInNum ? _defWidthInNum : .8
    let height = _defHeightInNum ? _defHeightInNum : .5
    let defBackgroundC = "#27282a";

    if (_childUI) {
        if (_childUI.length) {
            _childUI.forEach(chld => rect.addControl(chld))
        } else {
            rect.addControl(_childUI)
        }
    }

    rect.width = width
    rect.height = height
    rect.background = _background ? _background : defBackgroundC
    rect.cornerRadius = _cornerRadius ? _cornerRadius : 3

    if (_ADTexture) _ADTexture.addControl(rect)

    return rect
}
export function createTxt(_textLabel, _fontSize, _color) {
    const textBlock = new GUI.TextBlock("textblock", _textLabel)
    textBlock.color = _color ? _color : "white"
    textBlock.fontSize = _fontSize ? _fontSize : "40px"
    return textBlock
}
export function createCheckBox(_label, _ADTexture, _isChecked, _callBWhenValueChanged, _bxSize, _fontS, _background, _isBxPositionLeft) {
    // let checkBx = new GUI.Checkbox.AddCheckBoxWithHeader("checkbox: ", _callBWhenValueChanged)
    const checkBx = new GCheckBx("checkbox")
    checkBx.isChecked = _isChecked
    // checkBx.onIsCheckedChangedObservable.add(_callBWhenValueChanged)

    const header = GUI.Checkbox.AddHeader(checkBx, _label, _fontS ? _fontS : "100px", {
        isHorizontal: true, controlFirst: _isBxPositionLeft
    })
    let defSize = "25px"
    let defBackgroundC = "#27282a";

    header.color = "red"
    checkBx.width = _bxSize ? _bxSize : defSize
    checkBx.height = _bxSize ? _bxSize : defSize
    checkBx.color = "white"
    checkBx.background = _background ? _background : defBackgroundC


    if (_ADTexture) {
        _ADTexture.addControl(checkBx)
        _ADTexture.addControl(header)
    }

    return { checkBx, header }
}
export function createGuiImg(imageName, _imgUrl){
    const image = new BABYLON.GUI.Image(imageName, _imgUrl); // Replace with your image URL
    image.width = .5
    image.height = .5
    // image.width = "200px";  // Width of the image
    // image.height = "200px"; // Height of the image

    return image        
}

// VR Related
export function createButtonForHand(buttonLabel, parentMesh, scene, toCollide, callbackWhenPressed){
    const btnBackGroundColor = "#242424"
    
    const btnMesh = MeshBuilder.CreatePlane(`button`,{width: 5, height: 5},scene);
    

    const collisionBx = MeshBuilder.CreateBox("asd", { size: .4, width: 1.5}, scene)
    collisionBx.parent = btnMesh
    collisionBx.isVisible = false

    // btnMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const texture = GUI.AdvancedDynamicTexture.CreateForMesh(btnMesh);
    const btn = GBtn.CreateSimpleButton(`btn`, buttonLabel);

    btn.height =  .1;
    btn.width =  .25

    btn.color = "white";
    btn.fontSize = "50px";
    btn.thickness = 4
    btn.background = btnBackGroundColor

    texture.addControl(btn);

    if(parentMesh) btnMesh.parent = parentMesh
    // btn.onPointerUpObservable.add(() => {
    //     console.log("Button clicked!");
    // });

    if(toCollide){
        collisionBx.actionManager = new BABYLON.ActionManager(scene)
        collisionBx.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            {
                trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
                parameter: toCollide
            }, e => {
                if(callbackWhenPressed) callbackWhenPressed()
                btn.background = "gray";
            }
        ))
        collisionBx.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            {
                trigger: BABYLON.ActionManager.OnIntersectionExitTrigger,
                parameter: toCollide
            }, e => {
               
                btn.background = btnBackGroundColor
            }
        ))
    }
 
    return btnMesh
}