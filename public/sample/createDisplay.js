const { Mesh, GUI } = BABYLON


let text1
let text2
export function displayTxt(cam, scene){
    const nameMesh = Mesh.CreatePlane("nameTag", 5, scene);
    nameMesh.isPickable = false

    nameMesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const textureForName = GUI.AdvancedDynamicTexture.CreateForMesh(nameMesh);

    // Create a simple text block
    text1 = new GUI.TextBlock();
    text1.text = "asd ";
    text1.color = "white";
    text1.fontSize = 28;
    text1.top = "-40px"; // Adjust position if necessary
    text1.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    text1.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

    text2 = new GUI.TextBlock();
    text2.text = "asd ";
    text2.color = "white";
    text2.fontSize = 28;
    text2.top = "-40px"; // Adjust position if necessary
    text2.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    text2.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    // nameMesh.parent = cam
    // nameMesh.position.z += 1.5
    // Add the text block to the GUI texture
    textureForName.addControl(text1);
    textureForName.addControl(text2);

    return {text1, text2, nameMesh}
}